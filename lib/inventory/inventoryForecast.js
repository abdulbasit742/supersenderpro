// lib/inventory/inventoryForecast.js
// ────────────────────────────────────────────────────────────────────
// AI Inventory & Restock Forecaster. Stockouts lose sales; overstock ties up
// cash. This tracks per-product stock + sales, computes demand velocity
// (recency-weighted units/day), days-of-cover, and a concrete reorder
// recommendation (reorder point + suggested order quantity from lead time +
// safety stock). The AI Brain Bridge (self-hosted Ollama) only phrases the
// restock alert; all the forecasting is deterministic + explainable.
//
// Feeds naturally from order confirmations (record a sale per item). Pairs with
// the support agent (\"in stock?\") and upsell. File-backed. Zero new npm deps.
// ────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

let processPrompt;
try { ({ processPrompt } = require('../../ai/aiBrain')); }
catch (e) { console.warn('[inventory] aiBrain unavailable:', e.message); processPrompt = null; }

const MODEL = () => process.env.INVENTORY_MODEL || process.env.SUPPORT_AGENT_MODEL || 'qwen2.5:32b';

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'inventory');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const stockFile = (storeId) => path.join(DATA_DIR, `${storeId}_stock.json`);
const configFile = (storeId) => path.join(DATA_DIR, `${storeId}_config.json`);

function readJSON(p, fb) { try { return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : fb; } catch { return fb; } }
function writeJSON(p, d) { try { fs.writeFileSync(p, JSON.stringify(d, null, 2)); } catch (e) { console.error('[inventory] write failed:', e.message); } }

const DEFAULT_CONFIG = {
  leadTimeDays: 7,        // how long restocking takes
  safetyDays: 3,         // buffer stock in days of demand
  lowCoverDays: 5,       // alert when days-of-cover drops below this
  velocityWindowDays: 30 // look back this far for demand
};
function getConfig(storeId) { return readJSON(configFile(storeId), { ...DEFAULT_CONFIG }); }
function setConfig(storeId, updates = {}) { const m = { ...getConfig(storeId), ...updates }; writeJSON(configFile(storeId), m); return m; }

function norm(name) { return String(name || '').toLowerCase().trim().replace(/\s+/g, ' '); }
function readStock(storeId) { return readJSON(stockFile(storeId), {}); }
function writeStock(storeId, d) { writeJSON(stockFile(storeId), d); }

function rec(stock, product) {
  const key = norm(product);
  return stock[key] || { product: key, onHand: 0, sales: [] }; // sales: [{ ts, qty }]
}

/** Set / adjust on-hand stock for a product. */
function setStock({ storeId = 'default_store', product, onHand } = {}) {
  if (!product) throw new Error('product is required');
  if (onHand == null || isNaN(Number(onHand))) throw new Error('onHand (number) is required');
  const stock = readStock(storeId);
  const r = rec(stock, product); r.onHand = Math.max(0, Math.round(Number(onHand)));
  stock[norm(product)] = r; writeStock(storeId, stock);
  return { product: r.product, onHand: r.onHand };
}

/** Record a sale (decrements stock, logs for velocity). Call on order confirm. */
function recordSale({ storeId = 'default_store', product, qty = 1, ts = Date.now() } = {}) {
  if (!product) throw new Error('product is required');
  const q = Math.max(1, Math.round(qty));
  const stock = readStock(storeId);
  const r = rec(stock, product);
  r.onHand = Math.max(0, r.onHand - q);
  r.sales.push({ ts, qty: q });
  // keep ~120 days of sales history
  const cutoff = Date.now() - 120 * 86400000;
  r.sales = r.sales.filter(s => s.ts >= cutoff);
  stock[norm(product)] = r; writeStock(storeId, stock);
  return { product: r.product, onHand: r.onHand, soldQty: q };
}

// ── Demand velocity (recency-weighted units/day) ────────────────────────
function velocity(sales, windowDays) {
  const now = Date.now();
  const winMs = windowDays * 86400000;
  const recent = sales.filter(s => now - s.ts <= winMs);
  if (!recent.length) return 0;
  // recency weight: a sale today counts ~2x one at the window edge
  let wSum = 0, qSum = 0;
  for (const s of recent) {
    const ageFrac = (now - s.ts) / winMs;       // 0 (now) .. 1 (edge)
    const w = 1 + (1 - ageFrac);                  // 2 .. 1
    wSum += w; qSum += s.qty * w;
  }
  // normalize to units/day over the observed span
  const spanDays = Math.max(1, Math.min(windowDays, (now - Math.min(...recent.map(s => s.ts))) / 86400000));
  return +(qSum / wSum * (recent.reduce((a, s) => a + s.qty, 0) / spanDays) / (qSum / wSum || 1)).toFixed(3) || +(recent.reduce((a, s) => a + s.qty, 0) / spanDays).toFixed(3);
}

// simpler, robust units/day: total recent qty / span days (kept as the primary metric)
function unitsPerDay(sales, windowDays) {
  const now = Date.now();
  const recent = sales.filter(s => now - s.ts <= windowDays * 86400000);
  if (!recent.length) return 0;
  const total = recent.reduce((a, s) => a + s.qty, 0);
  const spanDays = Math.max(1, Math.min(windowDays, (now - Math.min(...recent.map(s => s.ts))) / 86400000));
  return +(total / spanDays).toFixed(3);
}

/**
 * Forecast a single product: velocity, days-of-cover, reorder point + suggested qty.
 */
function forecast({ storeId = 'default_store', product } = {}) {
  if (!product) throw new Error('product is required');
  const cfg = getConfig(storeId);
  const stock = readStock(storeId);
  const r = rec(stock, product);
  const perDay = unitsPerDay(r.sales, cfg.velocityWindowDays);
  const daysOfCover = perDay > 0 ? +(r.onHand / perDay).toFixed(1) : (r.onHand > 0 ? Infinity : 0);
  const reorderPoint = Math.ceil(perDay * (cfg.leadTimeDays + cfg.safetyDays));
  const needsReorder = r.onHand <= reorderPoint && perDay > 0;
  // suggest enough to cover lead time + safety + a 30-day horizon, minus on-hand
  const targetStock = Math.ceil(perDay * (cfg.leadTimeDays + cfg.safetyDays + 30));
  const suggestedQty = Math.max(0, targetStock - r.onHand);
  const status = perDay === 0 ? (r.onHand > 0 ? 'idle' : 'out') : (r.onHand === 0 ? 'stockout' : (daysOfCover <= cfg.lowCoverDays ? 'low' : 'healthy'));
  return { product: r.product, onHand: r.onHand, unitsPerDay: perDay, daysOfCover: daysOfCover === Infinity ? null : daysOfCover, reorderPoint, needsReorder, suggestedQty, status, config: cfg };
}

/** Forecast all products, optionally only those needing attention. */
function forecastAll({ storeId = 'default_store', onlyAlerts = false } = {}) {
  const stock = readStock(storeId);
  const out = Object.keys(stock).map(k => forecast({ storeId, product: k }));
  const list = onlyAlerts ? out.filter(f => f.status === 'low' || f.status === 'stockout' || f.needsReorder) : out;
  return list.sort((a, b) => (a.daysOfCover == null ? 1 : a.daysOfCover) - (b.daysOfCover == null ? 1 : b.daysOfCover));
}

// ── Alert phrasing ────────────────────────────────────────────
function templateAlert(f) {
  if (f.status === 'stockout') return `\u26a0\ufe0f ${f.product} is OUT OF STOCK (selling ~${f.unitsPerDay}/day). Reorder ~${f.suggestedQty} now.`;
  if (f.status === 'low') return `\ud83d\udd3b ${f.product}: only ${f.onHand} left (~${f.daysOfCover} days cover). Reorder ~${f.suggestedQty}.`;
  if (f.needsReorder) return `\ud83d\udce6 ${f.product} hit reorder point (${f.onHand} \u2264 ${f.reorderPoint}). Order ~${f.suggestedQty}.`;
  return `\u2705 ${f.product}: ${f.onHand} in stock, ~${f.daysOfCover} days cover.`;
}

async function alertMessage({ storeId = 'default_store', product } = {}) {
  const f = forecast({ storeId, product });
  if (!processPrompt) return { ...f, message: templateAlert(f), source: 'fallback' };
  const prompt = [
    'Write ONE short inventory alert line for a shop owner.',
    `Product: ${f.product}. On hand: ${f.onHand}. Velocity: ${f.unitsPerDay}/day. Days of cover: ${f.daysOfCover}. Status: ${f.status}. Suggested reorder qty: ${f.suggestedQty}.`,
    'Be concrete and brief. Return ONLY the message.'
  ].join('\n');
  try {
    const raw = await processPrompt(prompt, { model: MODEL() });
    if (!raw || /\[AI Assist\]|Connect your .* in the environment/i.test(raw)) return { ...f, message: templateAlert(f), source: 'fallback' };
    return { ...f, message: String(raw).trim().replace(/^"|"$/g, ''), source: 'ollama' };
  } catch { return { ...f, message: templateAlert(f), source: 'fallback' }; }
}

/** Is a product available to sell right now? (for the support agent \"in stock?\") */
function inStock({ storeId = 'default_store', product, qty = 1 } = {}) {
  const r = rec(readStock(storeId), product);
  return { product: norm(product), onHand: r.onHand, available: r.onHand >= qty };
}

function health() { return { ok: true, brainBridge: Boolean(processPrompt), model: MODEL() }; }

module.exports = { setStock, recordSale, forecast, forecastAll, alertMessage, inStock, getConfig, setConfig, health, _internal: { unitsPerDay, velocity, templateAlert, norm, DEFAULT_CONFIG } };
