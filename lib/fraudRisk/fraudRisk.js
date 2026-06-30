// lib/fraudRisk/fraudRisk.js
// ────────────────────────────────────────────────────────────────────
// AI Order Fraud + COD-Risk Scorer. Cash-on-delivery is huge in this market and
// so is its pain: fake orders, refusals, return-to-origin (RTO) that eats your
// shipping. This scores each order\'s risk 0-100 BEFORE you fulfill, recommends
// an action (approve / verify / require-advance / hold), and — when verification
// helps — the AI Brain Bridge (Ollama) phrases a polite confirm message.
//
// The score is fully deterministic + explainable (every point has a reason); the
// model is only used to phrase the verification ask. Learns from recorded
// outcomes (delivered vs returned) to sharpen the per-contact RTO history.
// Reads lead-intel (#11) / customer-360 (#48) signals when present. Zero new deps.
// ────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

let processPrompt;
try { ({ processPrompt } = require('../../ai/aiBrain')); }
catch (e) { console.warn('[fraudRisk] aiBrain unavailable:', e.message); processPrompt = null; }

const MODEL = () => process.env.FRAUD_MODEL || process.env.SUPPORT_AGENT_MODEL || 'qwen2.5:32b';
const CURRENCY = () => process.env.ORDER_CURRENCY || 'PKR';

const DATA_ROOT = path.join(__dirname, '..', '..', 'data');
const DATA_DIR = path.join(DATA_ROOT, 'fraud_risk');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const histFile = (storeId) => path.join(DATA_DIR, `${storeId}_history.json`);
const configFile = (storeId) => path.join(DATA_DIR, `${storeId}_config.json`);

function readJSON(p, fb) { try { return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : fb; } catch { return fb; } }
function writeJSON(p, d) { try { fs.writeFileSync(p, JSON.stringify(d, null, 2)); } catch (e) { console.error('[fraudRisk] write failed:', e.message); } }

const DEFAULT_CONFIG = {
  highValueThreshold: 10000,    // orders above this get extra scrutiny
  requireAdvanceAbove: 60,      // risk >= this -> ask for advance payment
  holdAbove: 80,                // risk >= this -> hold for manual review
  verifyAbove: 40,              // risk >= this -> send a verification message
  burstWindowMins: 30,          // multiple orders within this = velocity flag
  burstCount: 3
};
function getConfig(storeId) { return readJSON(configFile(storeId), { ...DEFAULT_CONFIG }); }
function setConfig(storeId, updates = {}) { const m = { ...getConfig(storeId), ...updates }; writeJSON(configFile(storeId), m); return m; }

// per-contact history: { phone: { orders, delivered, returned, cancelled, lastOrderTs, recentTs:[] } }
function readHist(storeId) { return readJSON(histFile(storeId), {}); }
function writeHist(storeId, d) { writeJSON(histFile(storeId), d); }

// optional cross-feature signals
function leadInfo(storeId, phone) {
  const l = readJSON(path.join(DATA_ROOT, 'lead_intel', `${storeId}_scores.json`), {})[phone];
  return l ? { atRisk: Boolean(l.atRisk), band: l.band } : null;
}

// ── Signal extraction + deterministic scoring ─────────────────────────
function digitsOnly(s) { return String(s || '').replace(/\D/g, ''); }
function looksOddNumber(phone) {
  const d = digitsOnly(phone);
  if (d.length < 7) return true;                 // too short
  if (/^(\d)\1+$/.test(d)) return true;           // all same digit
  if (/0123456|1234567|7654321/.test(d)) return true; // sequential
  return false;
}
function addressComplete(addr) {
  const a = String(addr || '').trim();
  if (a.length < 10) return false;
  // wants at least some street + area/city signal
  return /\d/.test(a) || a.split(/\s+/).length >= 3;
}

/**
 * Score an order. Pure + deterministic; returns score, band, action, reasons.
 * @param {object} order { phone, value, address?, items?, paymentMethod? ('cod'|'advance'|...) }
 * @param {object} ctx   { storeId, config, hist(forPhone), lead }
 */
function scoreOrder(order, ctx) {
  const cfg = ctx.config || DEFAULT_CONFIG;
  const h = ctx.hist || { orders: 0, delivered: 0, returned: 0, cancelled: 0, recentTs: [] };
  const reasons = [];
  let risk = 0;
  const isCOD = !order.paymentMethod || /cod|cash/i.test(order.paymentMethod);

  // 1) New vs known
  if (h.orders === 0) { risk += 20; reasons.push('new customer, no order history (+20)'); }
  else if (h.delivered >= 2 && h.returned === 0) { risk -= 15; reasons.push(`trusted: ${h.delivered} delivered, 0 returns (-15)`); }

  // 2) Prior RTO / cancels
  if (h.returned > 0) { const p = Math.min(30, h.returned * 15); risk += p; reasons.push(`${h.returned} prior return(s)/RTO (+${p})`); }
  if (h.cancelled > 0) { const p = Math.min(15, h.cancelled * 5); risk += p; reasons.push(`${h.cancelled} prior cancel(s) (+${p})`); }

  // 3) Value vs norms
  if (order.value != null && order.value >= cfg.highValueThreshold) { risk += 15; reasons.push(`high-value order (>= ${CURRENCY()} ${cfg.highValueThreshold}) (+15)`); }

  // 4) Address completeness (matters most for COD)
  if (isCOD && !addressComplete(order.address)) { risk += 20; reasons.push('incomplete delivery address on COD (+20)'); }

  // 5) Velocity / burst
  const now = order.ts || Date.now();
  const windowMs = (cfg.burstWindowMins || 30) * 60000;
  const recent = (h.recentTs || []).filter(t => now - t <= windowMs).length;
  if (recent + 1 >= (cfg.burstCount || 3)) { risk += 20; reasons.push(`${recent + 1} orders within ${cfg.burstWindowMins}m (velocity) (+20)`); }

  // 6) Odd / disposable-looking number
  if (looksOddNumber(order.phone)) { risk += 15; reasons.push('suspicious phone number pattern (+15)'); }

  // 7) Lead at-risk flag (negative sentiment / complaints history)
  if (ctx.lead && ctx.lead.atRisk) { risk += 10; reasons.push('contact flagged at-risk (+10)'); }

  // COD inherently carries more risk than prepaid
  if (isCOD) { risk += 5; reasons.push('cash-on-delivery (+5)'); }
  else { risk -= 15; reasons.push('prepaid/advance payment (-15)'); }

  risk = Math.max(0, Math.min(100, Math.round(risk)));
  const band = risk >= cfg.holdAbove ? 'high' : risk >= cfg.requireAdvanceAbove ? 'elevated' : risk >= cfg.verifyAbove ? 'medium' : 'low';

  let action;
  if (risk >= cfg.holdAbove) action = 'hold';
  else if (risk >= cfg.requireAdvanceAbove) action = 'require_advance';
  else if (risk >= cfg.verifyAbove) action = 'verify';
  else action = 'approve';

  return { score: risk, band, action, isCOD, reasons };
}

// ── Verification message phrasing ────────────────────────────────
function templateVerify(action, value) {
  const c = CURRENCY();
  if (action === 'require_advance') return `To confirm your order we kindly ask for a small advance payment${value ? ` (order total ${c} ${value})` : ''}. Once received we\'ll dispatch right away. \ud83d\ude4f`;
  if (action === 'verify') return 'Just to confirm your order, could you please share your full delivery address and a good time to deliver? \ud83d\ude4f';
  if (action === 'hold') return 'Thanks! Your order needs a quick manual review, our team will reach out shortly to confirm. \ud83d\ude4f';
  return 'Your order is confirmed! \u2705';
}

async function phraseVerify(action, value) {
  if (!processPrompt || action === 'approve') return templateVerify(action, value);
  const intent = {
    require_advance: 'Politely ask for a small advance payment to confirm a cash-on-delivery order, without sounding accusatory.',
    verify: 'Politely ask the customer to confirm their full delivery address and preferred delivery time.',
    hold: 'Tell the customer their order needs a brief manual review and the team will reach out, friendly and reassuring.'
  }[action];
  const prompt = ['Write ONE short, friendly WhatsApp message. ' + intent, 'Match the customer\'s language (English/Urdu/Roman Urdu). Do not sound suspicious or rude. Return ONLY the message.'].join('\n');
  try {
    const raw = await processPrompt(prompt, { model: MODEL() });
    if (!raw || /\[AI Assist\]|Connect your .* in the environment/i.test(raw)) return templateVerify(action, value);
    return String(raw).trim().replace(/^"|"$/g, '');
  } catch { return templateVerify(action, value); }
}

// ── Public API ──────────────────────────────────────────────────
/**
 * Assess an order\'s risk and recommend an action (+ verification message).
 * @returns {Promise<{ score, band, action, isCOD, reasons, message, source }>}
 */
async function assess({ storeId = 'default_store', order = {} } = {}) {
  if (!order.phone) throw new Error('order.phone is required');
  const config = getConfig(storeId);
  const histAll = readHist(storeId);
  const hist = histAll[order.phone] || { orders: 0, delivered: 0, returned: 0, cancelled: 0, recentTs: [] };
  const lead = leadInfo(storeId, order.phone);
  const scored = scoreOrder(order, { storeId, config, hist, lead });

  // record this order attempt timestamp for velocity tracking (does not assume outcome)
  hist.recentTs = (hist.recentTs || []).filter(t => Date.now() - t <= 24 * 3600 * 1000); hist.recentTs.push(order.ts || Date.now());
  histAll[order.phone] = hist; writeHist(storeId, histAll);

  const message = await phraseVerify(scored.action, order.value);
  return { ...scored, message, source: processPrompt && scored.action !== 'approve' ? 'ollama' : 'fallback' };
}

/**
 * Record the real outcome of an order so scoring learns (delivered lowers future
 * risk; returned/cancelled raises it).
 * @param {object} args { storeId?, phone, outcome:'delivered'|'returned'|'cancelled' }
 */
function recordOutcome({ storeId = 'default_store', phone, outcome } = {}) {
  if (!phone || !outcome) throw new Error('phone and outcome are required');
  const histAll = readHist(storeId);
  const h = histAll[phone] || { orders: 0, delivered: 0, returned: 0, cancelled: 0, recentTs: [] };
  h.orders += 1;
  if (outcome === 'delivered') h.delivered += 1;
  else if (outcome === 'returned') h.returned += 1;
  else if (outcome === 'cancelled') h.cancelled += 1;
  h.lastOrderTs = Date.now();
  histAll[phone] = h; writeHist(storeId, histAll);
  return { ok: true, history: h };
}

function stats({ storeId = 'default_store' } = {}) {
  const h = readHist(storeId);
  const phones = Object.keys(h);
  const delivered = phones.reduce((a, p) => a + (h[p].delivered || 0), 0);
  const returned = phones.reduce((a, p) => a + (h[p].returned || 0), 0);
  const orders = phones.reduce((a, p) => a + (h[p].orders || 0), 0);
  return { contacts: phones.length, orders, delivered, returned, rtoRate: orders ? +(returned / orders).toFixed(3) : null };
}

function health() { return { ok: true, brainBridge: Boolean(processPrompt), model: MODEL(), currency: CURRENCY() }; }

module.exports = { assess, recordOutcome, stats, getConfig, setConfig, health, _internal: { scoreOrder, looksOddNumber, addressComplete, templateVerify, DEFAULT_CONFIG } };
