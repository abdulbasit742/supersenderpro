// ai/knowledgeBase/ragStore.js
// ────────────────────────────────────────────────────────────────────
// Self-hosted RAG vector store (local embeddings, zero external cost).
//
// Embeddings are produced by the self-hosted Ollama server via its native
// /api/embeddings endpoint (default model: nomic-embed-text). Vectors + source
// chunks are persisted per-store as JSON under data/knowledge_base/. Retrieval
// is cosine top-k. If embeddings are unavailable (model not pulled / Ollama
// down), the store degrades to a deterministic keyword-overlap search so the
// caller always gets something useful instead of an error.
//
// No new npm dependencies: Node built-ins + global fetch (Node >= 18) only.
// ────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'knowledge_base');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const storeFile = (storeId) => path.join(DATA_DIR, `${storeId}_vectors.json`);

const OLLAMA_HOST = () => process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const EMBED_MODEL = () => process.env.RAG_EMBED_MODEL || 'nomic-embed-text';

// ── Persistence ───────────────────────────────────────────────────────
function load(storeId) {
  try {
    const f = storeFile(storeId);
    if (!fs.existsSync(f)) return { storeId, model: EMBED_MODEL(), dim: null, docs: [] };
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch { return { storeId, model: EMBED_MODEL(), dim: null, docs: [] }; }
}
function save(storeId, data) {
  try { fs.writeFileSync(storeFile(storeId), JSON.stringify(data, null, 2)); }
  catch (e) { console.error('[ragStore] write failed:', e.message); }
}

// ── Text chunking ───────────────────────────────────────────────────
function chunkText(text, maxChars = 800, overlap = 120) {
  const clean = String(text || '').replace(/\r\n/g, '\n').trim();
  if (!clean) return [];
  if (clean.length <= maxChars) return [clean];
  // Prefer splitting on paragraph / sentence boundaries.
  const parts = clean.split(/\n{2,}/);
  const chunks = [];
  let buf = '';
  for (const p of parts) {
    if ((buf + '\n\n' + p).length <= maxChars) {
      buf = buf ? `${buf}\n\n${p}` : p;
    } else {
      if (buf) chunks.push(buf);
      if (p.length <= maxChars) {
        buf = p;
      } else {
        // hard-split very long paragraph with overlap
        for (let i = 0; i < p.length; i += (maxChars - overlap)) {
          chunks.push(p.slice(i, i + maxChars));
        }
        buf = '';
      }
    }
  }
  if (buf) chunks.push(buf);
  return chunks;
}

// ── Embeddings (Ollama) ───────────────────────────────────────────
async function embed(textOrTexts) {
  const inputs = Array.isArray(textOrTexts) ? textOrTexts : [textOrTexts];
  const url = `${OLLAMA_HOST()}/api/embeddings`;
  const out = [];
  for (const input of inputs) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: EMBED_MODEL(), prompt: input })
    });
    if (!res.ok) throw new Error(`embeddings HTTP ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const vec = data.embedding || (data.data && data.data[0] && data.data[0].embedding);
    if (!Array.isArray(vec)) throw new Error('embeddings: no vector in response');
    out.push(vec);
  }
  return Array.isArray(textOrTexts) ? out : out[0];
}

// ── Math ──────────────────────────────────────────────────────────
function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// Deterministic fallback: token-overlap (Jaccard-ish) scoring.
function keywordScore(query, text) {
  const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9\u0600-\u06FF\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);
  const q = new Set(norm(query));
  const t = new Set(norm(text));
  if (!q.size || !t.size) return 0;
  let inter = 0;
  for (const w of q) if (t.has(w)) inter++;
  return inter / Math.sqrt(q.size * t.size);
}

function hashId(s) { return crypto.createHash('sha1').update(s).digest('hex').slice(0, 12); }

// ── Public API ──────────────────────────────────────────────────
/**
 * Ingest free text (a doc, a policy, a product description...) into the store.
 * Returns { added, chunks, embedded }.
 */
async function ingestText(storeId = 'default_store', { title = '', text = '', source = 'manual', meta = {} } = {}) {
  if (!text || !String(text).trim()) throw new Error('text is required');
  const store = load(storeId);
  const chunks = chunkText(text);
  let embedded = true;
  let vectors = [];
  try {
    vectors = await embed(chunks);
    if (vectors[0]) store.dim = vectors[0].length;
  } catch (e) {
    embedded = false; // store text-only; search will use keyword fallback
    vectors = chunks.map(() => null);
    console.warn('[ragStore] embedding failed, storing text-only:', e.message);
  }
  const now = Date.now();
  chunks.forEach((c, i) => {
    store.docs.push({
      id: hashId(`${source}:${title}:${i}:${c.slice(0, 40)}:${now}`),
      title, source, meta, text: c, vector: vectors[i] || null, ts: now
    });
  });
  store.model = EMBED_MODEL();
  save(storeId, store);
  return { added: chunks.length, chunks: chunks.length, embedded };
}

/** Convenience: ingest an array of FAQ {q,a} pairs. */
async function ingestFaqs(storeId = 'default_store', faqs = []) {
  let total = 0; let embedded = true;
  for (const f of faqs) {
    if (!f || !f.q) continue;
    const r = await ingestText(storeId, { title: f.q, text: `Q: ${f.q}\nA: ${f.a || ''}`, source: 'faq' });
    total += r.added; embedded = embedded && r.embedded;
  }
  return { added: total, embedded };
}

/** Convenience: ingest a product catalog. */
async function ingestProducts(storeId = 'default_store', products = []) {
  let total = 0; let embedded = true;
  for (const p of products) {
    if (!p || !p.name) continue;
    const body = [
      `Product: ${p.name}`,
      p.price != null ? `Price: ${p.price}` : '',
      p.inStock === false ? 'Availability: OUT OF STOCK' : 'Availability: in stock',
      p.description ? `Details: ${p.description}` : ''
    ].filter(Boolean).join('\n');
    const r = await ingestText(storeId, { title: p.name, text: body, source: 'product', meta: { productId: p.id } });
    total += r.added; embedded = embedded && r.embedded;
  }
  return { added: total, embedded };
}

/**
 * Retrieve the top-k most relevant chunks for a query.
 * Returns [{ text, title, source, score, mode }]. mode = 'vector' | 'keyword'.
 */
async function search(storeId = 'default_store', query, { k = 4, minScore = 0.2 } = {}) {
  if (!query || !String(query).trim()) return [];
  const store = load(storeId);
  if (!store.docs.length) return [];

  let qVec = null;
  try { qVec = await embed(query); } catch { qVec = null; }

  const haveVectors = qVec && store.docs.some(d => Array.isArray(d.vector));
  const scored = store.docs.map(d => {
    let score, mode;
    if (haveVectors && Array.isArray(d.vector)) { score = cosine(qVec, d.vector); mode = 'vector'; }
    else { score = keywordScore(query, d.text); mode = 'keyword'; }
    return { text: d.text, title: d.title, source: d.source, meta: d.meta, score, mode };
  });
  return scored
    .filter(s => s.score >= (haveVectors ? minScore : 0.01))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

function stats(storeId = 'default_store') {
  const store = load(storeId);
  const embeddedCount = store.docs.filter(d => Array.isArray(d.vector)).length;
  const bySource = store.docs.reduce((acc, d) => { acc[d.source] = (acc[d.source] || 0) + 1; return acc; }, {});
  return { storeId, model: store.model, dim: store.dim, totalChunks: store.docs.length, embeddedChunks: embeddedCount, bySource };
}

function clear(storeId = 'default_store') {
  save(storeId, { storeId, model: EMBED_MODEL(), dim: null, docs: [] });
  return { cleared: true, storeId };
}

function removeBySource(storeId = 'default_store', source) {
  const store = load(storeId);
  const before = store.docs.length;
  store.docs = store.docs.filter(d => d.source !== source);
  save(storeId, store);
  return { removed: before - store.docs.length, source };
}

async function health(storeId = 'default_store') {
  const host = OLLAMA_HOST();
  let embeddingsReachable = false;
  try {
    const v = await embed('healthcheck');
    embeddingsReachable = Array.isArray(v) && v.length > 0;
  } catch { embeddingsReachable = false; }
  return { ok: true, ollamaHost: host, embedModel: EMBED_MODEL(), embeddingsReachable, ...stats(storeId) };
}

module.exports = {
  ingestText, ingestFaqs, ingestProducts,
  search, stats, clear, removeBySource, health,
  _internal: { chunkText, cosine, keywordScore, embed }
};
