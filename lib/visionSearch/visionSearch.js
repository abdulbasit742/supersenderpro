// lib/visionSearch/visionSearch.js
// ────────────────────────────────────────────────────────────────────
// Image Product Search. A customer sends a PHOTO on WhatsApp ("do you have this?")
// and we find the closest products in the catalog. A self-hosted vision model
// (Ollama: llava / qwen2-vl) describes the image into structured tags; those tags
// are matched against the RAG knowledge base / product catalog.
//
// Layered + safe: vision is the ENRICHMENT, not a hard dependency. If the vision
// model is offline we still return a clean "send us a keyword" path, and any
// caller-supplied hint text is matched directly. All on your own GPUs.
//
// Zero new npm dependencies (global fetch; Node >= 18).
// ────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const OLLAMA_HOST = () => process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const VISION_MODEL = () => process.env.VISION_MODEL || 'llava:13b';

// Optional: reuse the RAG store to match against ingested products.
let rag = null;
try { rag = require('../../ai/knowledgeBase/ragStore'); } catch { /* optional */ }

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'vision_search');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const logFile = path.join(DATA_DIR, '_queries.json');

function logQuery(entry) {
  try {
    const all = fs.existsSync(logFile) ? JSON.parse(fs.readFileSync(logFile, 'utf8')) : [];
    all.push(entry);
    fs.writeFileSync(logFile, JSON.stringify(all.slice(-500), null, 2));
  } catch (e) { console.error('[visionSearch] log failed:', e.message); }
  return entry;
}

// ── Vision: image -> structured description ─────────────────────────────
async function describeImage(buffer) {
  if (!buffer || !buffer.length) throw new Error('empty image buffer');
  const b64 = Buffer.isBuffer(buffer) ? buffer.toString('base64') : String(buffer);
  const prompt = [
    'You are a product cataloguer. Look at this image and describe the MAIN product for a shop search.',
    'Respond in exactly this format, nothing else:',
    'CATEGORY: <one or two words>',
    'COLOR: <main colors>',
    'ATTRIBUTES: <comma-separated visible attributes: material, style, brand-if-readable, size cues>',
    'KEYWORDS: <5-8 comma-separated search keywords a shop would use>'
  ].join('\n');

  const res = await fetch(`${OLLAMA_HOST()}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: VISION_MODEL(), prompt, images: [b64], stream: false })
  });
  if (!res.ok) throw new Error(`vision HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.response || '';
  return parseDescription(text);
}

function parseDescription(text) {
  const grab = (label) => { const m = text.match(new RegExp(label + ':\\s*(.+)', 'i')); return m ? m[1].trim() : ''; };
  const category = grab('CATEGORY');
  const color = grab('COLOR');
  const attributes = grab('ATTRIBUTES');
  const keywordsRaw = grab('KEYWORDS') || `${category} ${color} ${attributes}`;
  const keywords = keywordsRaw.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
  return { category, color, attributes, keywords, raw: text.trim() };
}

// ── Matching against catalog ──────────────────────────────────────
async function matchCatalog(storeId, queryText, { k = 4 } = {}) {
  if (rag && typeof rag.search === 'function') {
    try {
      const hits = await rag.search(storeId, queryText, { k });
      // Prefer product-sourced chunks.
      const products = hits.filter(h => h.source === 'product');
      const chosen = (products.length ? products : hits).slice(0, k);
      return chosen.map(h => ({ title: h.title, text: h.text, score: h.score, source: h.source }));
    } catch (e) { console.warn('[visionSearch] catalog match failed:', e.message); }
  }
  return [];
}

/**
 * Search the catalog from an image (+ optional text hint).
 * @param {object} args
 * @param {Buffer} [args.buffer] - the product photo
 * @param {string} [args.hint] - optional text the customer also typed
 * @returns {Promise<object>} { description?, query, matches, source }
 */
async function searchByImage({ storeId = 'default_store', buffer, hint = '', phone, k = 4 } = {}) {
  const id = crypto.randomUUID().slice(0, 12);
  let description = null;
  let source = 'hint-only';

  if (buffer && buffer.length) {
    try { description = await describeImage(buffer); source = 'vision'; }
    catch (err) {
      console.warn('[visionSearch] vision failed:', err.message);
      source = 'vision_unavailable';
    }
  }

  const queryParts = [];
  if (description) queryParts.push(description.keywords.join(' '), description.category, description.color);
  if (hint) queryParts.push(hint);
  const query = queryParts.filter(Boolean).join(' ').trim();

  let matches = [];
  let answer;
  if (query) {
    matches = await matchCatalog(storeId, query, { k });
  }

  if (matches.length) {
    answer = `Found ${matches.length} matching item${matches.length > 1 ? 's' : ''}: ${matches.map(m => m.title).filter(Boolean).join(', ')}.`;
  } else if (source === 'vision' && description) {
    answer = `Looks like a ${[description.color, description.category].filter(Boolean).join(' ')}. I couldn't find an exact match in our catalog, want me to check stock manually?`;
  } else if (source === 'vision_unavailable') {
    answer = 'I had trouble reading that image. Could you type the product name or a keyword?';
  } else {
    answer = 'Send a photo of the product (or type its name) and I will find it for you.';
  }

  const result = { id, query, description, matches, answer, source };
  logQuery({ id, storeId, phone: phone || null, source, query, matchCount: matches.length, ts: Date.now() });
  return result;
}

async function health() {
  let visionReachable = false;
  try {
    const r = await fetch(`${OLLAMA_HOST()}/api/tags`, { method: 'GET' });
    visionReachable = r.ok;
  } catch { visionReachable = false; }
  return { ok: true, ollamaHost: OLLAMA_HOST(), visionModel: VISION_MODEL(), visionReachable, ragWired: Boolean(rag && rag.search) };
}

module.exports = { searchByImage, describeImage, matchCatalog, health, _internal: { parseDescription } };
