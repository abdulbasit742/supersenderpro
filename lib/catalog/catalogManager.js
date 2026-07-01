// lib/catalog/catalogManager.js
// ────────────────────────────────────────────────────────────────────
// AI Catalog Manager. Most WhatsApp sellers have products in their head, not in
// a clean catalog. This turns RAW input (\"red kurta 1500 cotton\") into a proper
// entry: a polished description, a category, search tags, and a normalized price
// — via the AI Brain Bridge (self-hosted Ollama) — then stores it and AUTO-INGESTS
// it into the RAG knowledge base (#3), so the support agent (#1), vision search
// (#23), upsell (#40) and order extraction (#25) immediately know the product.
//
// The enrichment is the only AI step and it has a deterministic fallback (parse
// price + build a basic entry) so it always produces a usable catalog row.
// File-backed. Zero new npm dependencies.
// ────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let processPrompt;
try { ({ processPrompt } = require('../../ai/aiBrain')); }
catch (e) { console.warn('[catalog] aiBrain unavailable:', e.message); processPrompt = null; }

let rag = null; try { rag = require('../../ai/knowledgeBase/ragStore'); } catch {}

const MODEL = () => process.env.CATALOG_MODEL || process.env.SUPPORT_AGENT_MODEL || 'qwen2.5:32b';
const CURRENCY = () => process.env.ORDER_CURRENCY || 'PKR';

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'catalog');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const catFile = (storeId) => path.join(DATA_DIR, `${storeId}_catalog.json`);

function readJSON(p, fb) { try { return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : fb; } catch { return fb; } }
function writeJSON(p, d) { try { fs.writeFileSync(p, JSON.stringify(d, null, 2)); } catch (e) { console.error('[catalog] write failed:', e.message); } }
function readCat(storeId) { return readJSON(catFile(storeId), {}); }
function writeCat(storeId, d) { writeJSON(catFile(storeId), d); }
function norm(s) { return String(s || '').toLowerCase().trim().replace(/\s+/g, ' '); }

// ── Deterministic parsing / fallback ───────────────────────────────
function parsePrice(text) {
  const m = String(text).match(/(?:rs\.?|pkr|\$)?\s*([0-9][0-9,]{1,8})(?:\s*(?:rs|pkr|rupees?))?/i);
  if (!m) return null;
  const n = parseInt(m[1].replace(/,/g, ''), 10);
  return isNaN(n) ? null : n;
}
const CATEGORY_HINTS = {
  apparel: ['shirt', 'kurta', 'kameez', 'dress', 'jeans', 'trouser', 'abaya', 'shawl', 'jacket', 'tshirt', 't-shirt', 'cap', 'shoes', 'sandal'],
  electronics: ['phone', 'mobile', 'charger', 'earbuds', 'headphone', 'laptop', 'mouse', 'cable', 'watch', 'speaker'],
  beauty: ['cream', 'serum', 'lipstick', 'makeup', 'perfume', 'soap', 'shampoo'],
  home: ['mug', 'bottle', 'lamp', 'cushion', 'bedsheet', 'towel', 'pan', 'kettle'],
  digital: ['subscription', 'license', 'account', 'voucher', 'gift card', 'ebook', 'course']
};
function guessCategory(text) {
  const t = norm(text);
  for (const [cat, words] of Object.entries(CATEGORY_HINTS)) if (words.some(w => t.includes(w))) return cat;
  return 'general';
}
function basicTags(name, raw) {
  const words = norm(`${name} ${raw}`).split(/\s+/).filter(w => w.length > 2 && !/^\d+$/.test(w));
  return [...new Set(words)].slice(0, 8);
}
function fallbackEntry({ name, raw, price }) {
  const p = price != null ? price : parsePrice(raw || '');
  return {
    name: name || (raw || '').split(/[,.;]/)[0].trim().slice(0, 60) || 'Product',
    description: (raw && raw.trim()) ? raw.trim().slice(0, 200) : `${name}.`,
    category: guessCategory(`${name} ${raw}`),
    tags: basicTags(name, raw || ''),
    price: p,
    source: 'fallback'
  };
}

function stripJson(s) { const f = String(s).match(/```(?:json)?\s*([\s\S]*?)```/i); let b = f ? f[1] : s; const a = b.indexOf('{'), e = b.lastIndexOf('}'); if (a >= 0 && e > a) b = b.slice(a, e + 1); return b.trim(); }

/**
 * Enrich raw product input into a structured catalog entry (does not store).
 * @returns {Promise<{ name, description, category, tags, price, source }>}
 */
async function enrich({ name, raw = '', price } = {}) {
  if (!name && !raw) throw new Error('name or raw is required');
  if (!processPrompt) return fallbackEntry({ name, raw, price });
  const prompt = [
    'Turn this raw product info into a clean catalog entry. Output STRICT JSON only.',
    'Schema: {"name":string, "description":string (1-2 sentences, appealing but honest), "category":string (one word), "tags":[string] (5-8 search keywords), "price":number|null}',
    `Currency context: ${CURRENCY()}. Do not invent a price if none is given (use null).`,
    '',
    `Raw input: "${name || ''} ${raw}".`,
    'JSON:'
  ].join('\n');
  try {
    const out = await processPrompt(prompt, { model: MODEL() });
    if (!out || /\[AI Assist\]|Connect your .* in the environment/i.test(out)) return fallbackEntry({ name, raw, price });
    const j = JSON.parse(stripJson(out));
    return {
      name: (j.name || name || 'Product').toString().slice(0, 80),
      description: (j.description || '').toString().slice(0, 300) || fallbackEntry({ name, raw, price }).description,
      category: (j.category || guessCategory(`${name} ${raw}`)).toString().toLowerCase().slice(0, 24),
      tags: Array.isArray(j.tags) ? j.tags.map(t => String(t).toLowerCase()).slice(0, 8) : basicTags(name, raw),
      price: (typeof j.price === 'number' ? j.price : (price != null ? price : parsePrice(raw || ''))),
      source: 'ollama'
    };
  } catch (e) { console.warn('[catalog] enrich failed:', e.message); return fallbackEntry({ name, raw, price }); }
}

// ── RAG sync ─────────────────────────────────────────────────
async function ingestToRAG(storeId, entry) {
  if (!rag || typeof rag.ingestProducts !== 'function') return { ingested: false };
  try { await rag.ingestProducts(storeId, [{ id: entry.id, name: entry.name, price: entry.price, description: `${entry.description} (category: ${entry.category}; tags: ${(entry.tags || []).join(', ')})`, inStock: entry.inStock !== false }]); return { ingested: true }; }
  catch (e) { console.warn('[catalog] RAG ingest failed:', e.message); return { ingested: false, error: e.message }; }
}

// ── Store ops ───────────────────────────────────────────────
/**
 * Enrich + store a product, then auto-ingest into RAG. Dedupes by normalized name.
 */
async function addProduct({ storeId = 'default_store', name, raw = '', price, inStock = true, syncRag = true } = {}) {
  const entry = await enrich({ name, raw, price });
  const cat = readCat(storeId);
  const key = norm(entry.name);
  const id = (cat[key] && cat[key].id) || ('P' + crypto.randomUUID().slice(0, 8));
  const record = { id, ...entry, inStock: inStock !== false, updatedAt: Date.now() };
  cat[key] = record; writeCat(storeId, cat);
  let rag = { ingested: false };
  if (syncRag) rag = await ingestToRAG(storeId, record);
  return { product: record, rag };
}

/** Bulk add raw lines (\"name - some words - price\" or freeform). */
async function bulkAdd({ storeId = 'default_store', items = [], syncRag = true } = {}) {
  const results = [];
  for (const it of items) {
    try {
      if (typeof it === 'string') { results.push(await addProduct({ storeId, raw: it, syncRag })); }
      else { results.push(await addProduct({ storeId, name: it.name, raw: it.raw || it.description || '', price: it.price, inStock: it.inStock, syncRag })); }
    } catch (e) { results.push({ error: e.message, input: it }); }
  }
  return { added: results.filter(r => r.product).length, total: items.length, results };
}

function listProducts({ storeId = 'default_store', category, limit = 500 } = {}) {
  let list = Object.values(readCat(storeId)).sort((a, b) => b.updatedAt - a.updatedAt);
  if (category) list = list.filter(p => p.category === String(category).toLowerCase());
  return list.slice(0, limit);
}
function getProduct({ storeId = 'default_store', name } = {}) { return readCat(storeId)[norm(name)] || null; }
function deleteProduct({ storeId = 'default_store', name } = {}) { const c = readCat(storeId); const had = Boolean(c[norm(name)]); delete c[norm(name)]; writeCat(storeId, c); return { deleted: had }; }

/** Re-ingest the entire catalog into RAG (e.g. after enabling embeddings). */
async function syncAllToRAG({ storeId = 'default_store' } = {}) {
  const list = Object.values(readCat(storeId));
  let ingested = 0;
  for (const e of list) { const r = await ingestToRAG(storeId, e); if (r.ingested) ingested++; }
  return { total: list.length, ingested };
}

function health() { return { ok: true, brainBridge: Boolean(processPrompt), model: MODEL(), ragWired: Boolean(rag && rag.ingestProducts), currency: CURRENCY() }; }

module.exports = { enrich, addProduct, bulkAdd, listProducts, getProduct, deleteProduct, syncAllToRAG, health, _internal: { parsePrice, guessCategory, basicTags, fallbackEntry, norm } };
