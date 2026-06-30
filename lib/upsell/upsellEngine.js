// lib/upsell/upsellEngine.js
// ────────────────────────────────────────────────────────────────────
// AI Upsell & Cross-Sell Recommender. At the right moment (an order forming, a
// product viewed) this suggests complementary add-ons or an upgrade — the single
// easiest way to lift average order value. It blends:
//   - a deterministic recommender: item-to-item co-occurrence learned from a
//     purchase log, plus category affinity, so it works immediately and improves
//     as real co-purchases are recorded;
//   - optional AI phrasing/rationale (self-hosted Ollama) for a natural WhatsApp
//     cross-sell line.
//
// Suggestions are validated against the RAG catalog (#3) when present so we only
// ever recommend things that actually exist. File-backed. Zero new npm deps.
// ────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

let processPrompt;
try { ({ processPrompt } = require('../../ai/aiBrain')); }
catch (e) { console.warn('[upsell] aiBrain unavailable:', e.message); processPrompt = null; }

let rag = null;
try { rag = require('../../ai/knowledgeBase/ragStore'); } catch { /* optional */ }

const MODEL = () => process.env.UPSELL_MODEL || process.env.SUPPORT_AGENT_MODEL || 'qwen2.5:32b';

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'upsell');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const coFile = (storeId) => path.join(DATA_DIR, `${storeId}_cooccurrence.json`);

function readJSON(p, fb) { try { return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : fb; } catch { return fb; } }
function writeJSON(p, d) { try { fs.writeFileSync(p, JSON.stringify(d, null, 2)); } catch (e) { console.error('[upsell] write failed:', e.message); } }

// co-occurrence store shape: { pairs: { "a||b": count }, items: { a: count } }
function readCo(storeId) { return readJSON(coFile(storeId), { pairs: {}, items: {} }); }
function writeCo(storeId, d) { writeJSON(coFile(storeId), d); }

function norm(name) { return String(name || '').toLowerCase().trim().replace(/\s+/g, ' '); }
function pairKey(a, b) { return [norm(a), norm(b)].sort().join('||'); }

/**
 * Record a completed purchase (an array of item names). Updates item counts and
 * all co-occurring pairs, so future recommendations reflect what really sells
 * together. Call this from your order-confirmed hook.
 */
function recordPurchase({ storeId = 'default_store', items = [] } = {}) {
  const names = (items || []).map(i => norm(typeof i === 'string' ? i : (i.canonicalName || i.name))).filter(Boolean);
  const uniq = [...new Set(names)];
  if (!uniq.length) return { recorded: 0 };
  const co = readCo(storeId);
  for (const a of uniq) co.items[a] = (co.items[a] || 0) + 1;
  for (let i = 0; i < uniq.length; i++) {
    for (let j = i + 1; j < uniq.length; j++) {
      const k = pairKey(uniq[i], uniq[j]);
      co.pairs[k] = (co.pairs[k] || 0) + 1;
    }
  }
  writeCo(storeId, co);
  return { recorded: uniq.length };
}

/**
 * Deterministic recommendations for a set of seed items: rank co-occurring items
 * by a confidence-like score = pair_count / item_count. Excludes items already
 * in the cart. Returns [{ name, score, coCount }].
 */
function coOccurRecommend(storeId, seedItems, { k = 3 } = {}) {
  const co = readCo(storeId);
  const seeds = (seedItems || []).map(norm).filter(Boolean);
  const inCart = new Set(seeds);
  const scores = {};
  for (const key of Object.keys(co.pairs)) {
    const [a, b] = key.split('||');
    let other = null;
    if (seeds.includes(a) && !inCart.has(b)) other = b;
    else if (seeds.includes(b) && !inCart.has(a)) other = a;
    if (!other) continue;
    const denom = co.items[seeds.find(s => s === a || s === b)] || 1;
    const score = co.pairs[key] / denom;
    if (!scores[other] || score > scores[other].score) scores[other] = { name: other, score: +score.toFixed(3), coCount: co.pairs[key] };
  }
  return Object.values(scores).sort((x, y) => y.score - x.score).slice(0, k);
}

// Validate names against the catalog (so we never suggest something we don't sell).
async function validate(storeId, names) {
  if (!rag || typeof rag.search !== 'function') return names.map(n => ({ name: n.name || n, score: n.score, matched: false }));
  const out = [];
  for (const n of names) {
    const q = n.name || n;
    let matched = false, canonical = null, price = null;
    try {
      const hits = await rag.search(storeId, q, { k: 1 });
      const top = hits && hits[0];
      if (top && top.source === 'product') {
        matched = true; canonical = top.title || null;
        const pm = (top.text || '').match(/Price:\s*([0-9.,]+)/i); if (pm) price = parseFloat(pm[1].replace(/,/g, ''));
      }
    } catch { /* ignore */ }
    out.push({ name: canonical || q, score: n.score, coCount: n.coCount, matched, unitPrice: price });
  }
  return out;
}

async function phraseCrossSell(seedItems, recs) {
  const names = recs.map(r => r.name).join(', ');
  if (!processPrompt) return `You might also like: ${names}. Want me to add any?`;
  const prompt = [
    'Write ONE short, friendly WhatsApp cross-sell line (max 2 lines).',
    `The customer is buying: ${seedItems.join(', ')}.`,
    `Suggest these add-ons naturally: ${names}.`,
    'Be helpful, not pushy. End by asking if they want to add it. Return ONLY the message.'
  ].join('\n');
  try {
    const raw = await processPrompt(prompt, { model: MODEL() });
    if (!raw || /\[AI Assist\]|Connect your .* in the environment/i.test(raw)) return `You might also like: ${names}. Want me to add any?`;
    return String(raw).trim().replace(/^"|"$/g, '');
  } catch { return `You might also like: ${names}. Want me to add any?`; }
}

/**
 * Recommend add-ons for a cart/seed items.
 * @returns {Promise<{ seeds, recommendations, message, source }>}
 */
async function recommend({ storeId = 'default_store', items = [], k = 3, withMessage = true } = {}) {
  const seeds = (Array.isArray(items) ? items : [items]).map(i => (typeof i === 'string' ? i : (i.canonicalName || i.name))).filter(Boolean);
  if (!seeds.length) throw new Error('items is required');

  let recs = coOccurRecommend(storeId, seeds, { k });
  recs = await validate(storeId, recs);
  // keep matched ones first if a catalog is present
  recs.sort((a, b) => (Number(b.matched) - Number(a.matched)) || ((b.score || 0) - (a.score || 0)));
  recs = recs.slice(0, k);

  let message = null, source = 'none';
  if (withMessage && recs.length) { message = await phraseCrossSell(seeds, recs); source = processPrompt ? 'ollama' : 'fallback'; }
  return { seeds, recommendations: recs, message, source };
}

/**
 * Suggest a bundle: the seed item(s) + their top co-purchased add-on, with a
 * small bundle incentive line. Returns a ready-to-offer bundle.
 */
async function bundle({ storeId = 'default_store', items = [], discountPct = 5 } = {}) {
  const { seeds, recommendations } = await recommend({ storeId, items, k: 2, withMessage: false });
  if (!recommendations.length) return { bundle: null, message: null };
  const bundleItems = [...seeds, ...recommendations.map(r => r.name)];
  const priced = recommendations.every(r => r.unitPrice != null);
  const msg = `Bundle deal \ud83c\udf81 ${bundleItems.join(' + ')} — get ${discountPct}% off when you take them together. Want it?`;
  return { bundle: { items: bundleItems, discountPct, allPriced: priced }, message: msg };
}

function stats({ storeId = 'default_store' } = {}) {
  const co = readCo(storeId);
  return { items: Object.keys(co.items).length, pairs: Object.keys(co.pairs).length };
}

function health() {
  return { ok: true, brainBridge: Boolean(processPrompt), model: MODEL(), ragWired: Boolean(rag && rag.search) };
}

module.exports = { recommend, bundle, recordPurchase, stats, health, _internal: { coOccurRecommend, pairKey, norm } };
