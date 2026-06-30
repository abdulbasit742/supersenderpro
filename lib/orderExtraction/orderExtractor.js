// lib/orderExtraction/orderExtractor.js
// ────────────────────────────────────────────────────────────────────
// AI Order Extraction. Customers don't fill forms on WhatsApp — they type
// "2 red shirts size M, deliver to Lahore, cash on delivery". This turns that
// free text into a STRUCTURED order the system can fulfill: items (name, qty,
// attributes), delivery address, payment method, and contact — plus a clean
// confirmation summary and a list of anything still missing.
//
// Extraction uses the AI Brain Bridge (self-hosted Ollama) to emit STRICT JSON;
// a deterministic regex parser is the fallback so orders still get captured when
// the model is offline. Items are validated against the RAG catalog when present
// (price + canonical name). File-backed draft orders. Zero new npm dependencies.
// ────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let processPrompt;
try { ({ processPrompt } = require('../../ai/aiBrain')); }
catch (e) { console.warn('[orderExtractor] aiBrain unavailable:', e.message); processPrompt = null; }

let rag = null;
try { rag = require('../../ai/knowledgeBase/ragStore'); } catch { /* optional */ }

const MODEL = () => process.env.ORDER_MODEL || process.env.SUPPORT_AGENT_MODEL || 'qwen2.5:32b';
const CURRENCY = () => process.env.ORDER_CURRENCY || 'PKR';

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'orders_draft');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const draftFile = (storeId) => path.join(DATA_DIR, `${storeId}_drafts.json`);

function readDrafts(storeId) {
  try { const f = draftFile(storeId); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {}; }
  catch { return {}; }
}
function writeDrafts(storeId, data) {
  try { fs.writeFileSync(draftFile(storeId), JSON.stringify(data, null, 2)); } catch (e) { console.error('[orderExtractor] write failed:', e.message); }
}

// ── Deterministic fallback parser ───────────────────────────────────
const PAY_WORDS = { cod: ['cod', 'cash on delivery', 'cash'], bank: ['bank', 'transfer', 'ibft'], jazzcash: ['jazzcash', 'jazz cash'], easypaisa: ['easypaisa', 'easy paisa'], card: ['card', 'credit', 'debit'] };
const CITY_HINTS = ['lahore', 'karachi', 'islamabad', 'rawalpindi', 'faisalabad', 'multan', 'peshawar', 'quetta', 'sialkot', 'gujranwala', 'hyderabad'];
const SIZE_RE = /\b(?:size\s*)?(xs|s|m|l|xl|xxl|\d{1,2})\b/i;
const COLORS = ['red', 'blue', 'green', 'black', 'white', 'yellow', 'pink', 'purple', 'orange', 'grey', 'gray', 'brown', 'navy'];

function parseFallback(text) {
  const t = String(text || '');
  const lower = t.toLowerCase();

  // payment
  let payment = null;
  for (const [method, words] of Object.entries(PAY_WORDS)) { if (words.some(w => lower.includes(w))) { payment = method; break; } }

  // city / address
  const city = CITY_HINTS.find(c => lower.includes(c)) || null;
  const addrMatch = t.match(/(?:deliver(?:y)?\s*(?:to|at)?|address[:\s]| pata |send to)\s*([^\n.,]{4,80})/i);
  const address = addrMatch ? addrMatch[1].trim() : (city ? city : null);

  // items: "<qty> <color?> <noun> [size X]" patterns; also bare nouns
  const items = [];
  const itemRe = /(\d{1,3})\s*x?\s*([a-z][a-z\s]{1,40}?)(?=(?:,|\.|;|\bsize\b|\bdeliver\b|\bto\b|$))/gi;
  let m;
  while ((m = itemRe.exec(lower)) !== null) {
    const qty = parseInt(m[1], 10);
    let name = m[2].trim();
    if (!name || qty <= 0 || qty > 999) continue;
    const color = COLORS.find(c => name.includes(c)) || null;
    const sizeM = (m[0].match(SIZE_RE) || t.match(SIZE_RE));
    const size = sizeM ? sizeM[1].toUpperCase() : null;
    items.push({ name, qty, color, size });
  }
  return { items, address, city, payment, contact: null };
}

function stripJson(s) {
  const fence = String(s).match(/```(?:json)?\s*([\s\S]*?)```/i);
  let body = fence ? fence[1] : s;
  const brace = body.indexOf('{'); const end = body.lastIndexOf('}');
  if (brace >= 0 && end > brace) body = body.slice(brace, end + 1);
  return body.trim();
}

async function parseAI(text) {
  if (!processPrompt) return null;
  const prompt = [
    'Extract a structured order from this WhatsApp message. Output STRICT JSON only, no prose.',
    'Schema: {"items":[{"name":string,"qty":number,"color":string|null,"size":string|null,"notes":string|null}],"address":string|null,"city":string|null,"payment":"cod"|"bank"|"jazzcash"|"easypaisa"|"card"|null,"contact":string|null}',
    'If a field is not present, use null (or [] for items). Do not invent values.',
    '',
    `Message: "${text}"`,
    '',
    'JSON:'
  ].join('\n');
  try {
    const raw = await processPrompt(prompt, { model: MODEL() });
    if (!raw || /\[AI Assist\]|Connect your .* in the environment/i.test(raw)) return null;
    const parsed = JSON.parse(stripJson(raw));
    if (!parsed || typeof parsed !== 'object') return null;
    parsed.items = Array.isArray(parsed.items) ? parsed.items.filter(i => i && i.name) : [];
    return parsed;
  } catch (err) { console.warn('[orderExtractor] AI parse failed:', err.message); return null; }
}

// ── Catalog validation (optional, via RAG) ────────────────────────────
async function validateItems(storeId, items) {
  if (!rag || typeof rag.search !== 'function') return items.map(i => ({ ...i, matched: false }));
  const out = [];
  for (const item of items) {
    let matched = false, canonical = null, price = null;
    try {
      const hits = await rag.search(storeId, item.name, { k: 1 });
      const top = hits && hits[0];
      if (top && top.source === 'product') {
        matched = true; canonical = top.title || null;
        const pm = (top.text || '').match(/Price:\s*([0-9.,]+)/i);
        if (pm) price = parseFloat(pm[1].replace(/,/g, ''));
      }
    } catch { /* ignore */ }
    out.push({ ...item, matched, canonicalName: canonical, unitPrice: price });
  }
  return out;
}

function summarize(order) {
  const lines = [];
  lines.push('\ud83d\uded2 *Order summary*');
  let total = 0; let haveAllPrices = true;
  order.items.forEach((it, i) => {
    const name = it.canonicalName || it.name;
    const bits = [it.color, it.size].filter(Boolean).join(' ');
    const line = `${i + 1}. ${name}${bits ? ` (${bits})` : ''} x${it.qty}`;
    if (it.unitPrice != null) { const sub = it.unitPrice * it.qty; total += sub; lines.push(`${line} — ${CURRENCY()} ${sub}`); }
    else { haveAllPrices = false; lines.push(line); }
  });
  if (order.address) lines.push(`\ud83d\udccd Deliver to: ${order.address}`);
  if (order.payment) lines.push(`\ud83d\udcb3 Payment: ${order.payment.toUpperCase()}`);
  if (haveAllPrices && total > 0) lines.push(`*Total: ${CURRENCY()} ${total}*`);
  lines.push('\nReply *CONFIRM* to place the order.');
  return { text: lines.join('\n'), total: haveAllPrices ? total : null };
}

function missingFields(order) {
  const missing = [];
  if (!order.items || !order.items.length) missing.push('items');
  if (!order.address) missing.push('delivery address');
  if (!order.payment) missing.push('payment method');
  return missing;
}

/**
 * Extract a draft order from free text. Persists it as a draft keyed by phone.
 * @returns {Promise<{ id, order, summary, missing, source }>}
 */
async function extractOrder({ storeId = 'default_store', phone, text } = {}) {
  if (!text || !String(text).trim()) throw new Error('text is required');
  let parsed = await parseAI(text);
  let source = 'ollama';
  if (!parsed) { parsed = parseFallback(text); source = 'fallback'; }

  const items = await validateItems(storeId, parsed.items || []);
  const order = {
    items,
    address: parsed.address || null,
    city: parsed.city || null,
    payment: parsed.payment || null,
    contact: parsed.contact || phone || null
  };
  const summary = summarize(order);
  const missing = missingFields(order);
  const id = crypto.randomUUID().slice(0, 12);
  const record = { id, storeId, phone: phone || null, order, summaryText: summary.text, total: summary.total, missing, status: 'draft', source, ts: Date.now() };

  if (phone) { const all = readDrafts(storeId); all[phone] = record; writeDrafts(storeId, all); }
  return { id, order, summary: summary.text, total: summary.total, missing, source };
}

/** Mark a phone's current draft confirmed (caller then hands off to fulfillment). */
function confirmOrder({ storeId = 'default_store', phone } = {}) {
  if (!phone) throw new Error('phone is required');
  const all = readDrafts(storeId);
  const draft = all[phone];
  if (!draft) return { confirmed: false, error: 'no draft order for this contact' };
  if (draft.missing && draft.missing.length) return { confirmed: false, missing: draft.missing, error: 'order incomplete' };
  draft.status = 'confirmed'; draft.confirmedAt = Date.now();
  all[phone] = draft; writeDrafts(storeId, all);
  return { confirmed: true, order: draft.order, total: draft.total, id: draft.id };
}

function getDraft({ storeId = 'default_store', phone } = {}) { return readDrafts(storeId)[phone] || null; }
function listDrafts({ storeId = 'default_store', status, limit = 50 } = {}) {
  let list = Object.values(readDrafts(storeId)).sort((a, b) => b.ts - a.ts);
  if (status) list = list.filter(d => d.status === status);
  return list.slice(0, limit);
}

function health() {
  return { ok: true, brainBridge: Boolean(processPrompt), model: MODEL(), ragWired: Boolean(rag && rag.search), currency: CURRENCY() };
}

module.exports = { extractOrder, confirmOrder, getDraft, listDrafts, health, _internal: { parseFallback, summarize, missingFields, stripJson } };
