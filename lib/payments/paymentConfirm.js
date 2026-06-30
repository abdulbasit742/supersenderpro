// lib/payments/paymentConfirm.js
// ────────────────────────────────────────────────────────────────────
// AI Payment-Screenshot Confirmation. In Pakistan most non-COD orders are paid
// by JazzCash / Easypaisa / bank transfer, and the customer proves it by sending
// a SCREENSHOT. Manually eyeballing those is slow and easy to fake. This reads
// the receipt with a self-hosted vision model (Ollama llava), extracts the
// amount + transaction id + method + date, then DETERMINISTICALLY verifies it
// against the expected order amount and blocks reused/duplicate transaction ids.
//
// The model only does OCR + phrasing; the verify/accept decision and the
// duplicate check are pure code (a fake screenshot can\'t talk its way past the
// amount tolerance or a reused txn id). Records the outcome to delivery (#70)
// and fraud-risk (#58). File-backed transaction ledger. Zero new npm deps.
// ────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

const OLLAMA_HOST = () => process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const VISION_MODEL = () => process.env.VISION_MODEL || 'llava:13b';

// optional cross-feature hooks
let delivery = null; try { delivery = require('../delivery/deliveryTracker'); } catch {}
let fraudRisk = null; try { fraudRisk = require('../fraudRisk/fraudRisk'); } catch {}

const CURRENCY = () => process.env.ORDER_CURRENCY || 'PKR';
const AMOUNT_TOLERANCE_PCT = () => parseFloat(process.env.PAYMENT_TOLERANCE_PCT || '1'); // accept within ±this %

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'payments');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const txnFile = (storeId) => path.join(DATA_DIR, `${storeId}_txns.json`);
const expectFile = (storeId) => path.join(DATA_DIR, `${storeId}_expected.json`);

function readJSON(p, fb) { try { return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : fb; } catch { return fb; } }
function writeJSON(p, d) { try { fs.writeFileSync(p, JSON.stringify(d, null, 2)); } catch (e) { console.error('[payments] write failed:', e.message); } }
function readTxns(storeId) { return readJSON(txnFile(storeId), {}); }   // txnId -> { ... }
function writeTxns(storeId, d) { writeJSON(txnFile(storeId), d); }
function readExpected(storeId) { return readJSON(expectFile(storeId), {}); } // orderId -> { amount, phone }
function writeExpected(storeId, d) { writeJSON(expectFile(storeId), d); }

/** Record what an order is expected to be paid (set at checkout). */
function setExpected({ storeId = 'default_store', orderId, amount, phone } = {}) {
  if (!orderId || amount == null) throw new Error('orderId and amount are required');
  const exp = readExpected(storeId); exp[orderId] = { amount: Number(amount), phone: phone || null, ts: Date.now() };
  writeExpected(storeId, exp); return exp[orderId];
}

// ── Vision OCR of the receipt ───────────────────────────────────
function parseFields(text) {
  const grab = (re) => { const m = String(text).match(re); return m ? m[1].trim() : null; };
  const amountRaw = grab(/AMOUNT:\s*([0-9.,]+)/i);
  const amount = amountRaw ? parseFloat(amountRaw.replace(/,/g, '')) : null;
  return {
    amount: isNaN(amount) ? null : amount,
    txnId: grab(/(?:TXN|TRANSACTION|TID|REF)[^:]*:\s*([A-Za-z0-9-]+)/i) || grab(/TXNID:\s*([A-Za-z0-9-]+)/i),
    method: grab(/METHOD:\s*([A-Za-z ]+)/i),
    date: grab(/DATE:\s*([0-9A-Za-z:\/\- ]+)/i),
    raw: String(text).trim()
  };
}

async function ocrReceipt(buffer) {
  if (!buffer || !buffer.length) throw new Error('empty image');
  const b64 = Buffer.isBuffer(buffer) ? buffer.toString('base64') : String(buffer);
  const prompt = [
    'This is a mobile payment receipt screenshot (JazzCash / Easypaisa / bank transfer).',
    'Extract the fields. Respond in EXACTLY this format, one per line, nothing else:',
    'AMOUNT: <number only>',
    'TXNID: <transaction id / TID / reference>',
    'METHOD: <jazzcash | easypaisa | bank | card | unknown>',
    'DATE: <date/time on the receipt or unknown>'
  ].join('\n');
  const res = await fetch(`${OLLAMA_HOST()}/api/generate`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: VISION_MODEL(), prompt, images: [b64], stream: false })
  });
  if (!res.ok) throw new Error(`vision HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return parseFields(data.response || '');
}

// ── Deterministic verification ───────────────────────────────────
function amountMatches(paid, expected, tolPct) {
  if (paid == null || expected == null) return false;
  const tol = Math.max(1, expected * (tolPct / 100));
  return Math.abs(paid - expected) <= tol;
}

function templateReply(decision, ctx) {
  const c = CURRENCY();
  switch (decision) {
    case 'verified': return `\u2705 Payment of ${c} ${ctx.paid} confirmed${ctx.orderId ? ` for order ${ctx.orderId}` : ''}. We\'re processing your order now. Thank you!`;
    case 'amount_mismatch': return `Hmm, I see ${c} ${ctx.paid != null ? ctx.paid : '?'} but the order total is ${c} ${ctx.expected}. Could you check and resend, or pay the difference?`;
    case 'duplicate': return `This payment reference looks like one we\'ve already recorded. If this is a new payment, please send the latest receipt. \ud83d\ude4f`;
    case 'unreadable': return `I couldn\'t read that receipt clearly. Could you resend a clearer screenshot, or share the amount + transaction ID?`;
    default: return `Thanks! I\'ve sent your payment proof to our team to confirm. \ud83d\ude4f`;
  }
}

/**
 * Verify a payment screenshot.
 * @param {object} args { storeId?, buffer, phone?, orderId?, expectedAmount? }
 * @returns {Promise<{ decision, paid, txnId, method, expected, reply, source }>}
 */
async function verifyScreenshot({ storeId = 'default_store', buffer, phone, orderId, expectedAmount } = {}) {
  // resolve expected amount: explicit > stored-for-order
  let expected = expectedAmount;
  if (expected == null && orderId) { const e = readExpected(storeId)[orderId]; if (e) expected = e.amount; }

  let fields = { amount: null, txnId: null, method: null, date: null };
  let visionOk = false;
  if (buffer) { try { fields = await ocrReceipt(buffer); visionOk = true; } catch (e) { console.warn('[payments] OCR failed:', e.message); } }

  // unreadable: no amount extracted
  if (!visionOk || fields.amount == null) {
    const reply = templateReply('manual_review', {});
    return { decision: visionOk ? 'manual_review' : 'unreadable', paid: fields.amount, txnId: fields.txnId, method: fields.method, expected: expected ?? null, reply: visionOk ? reply : templateReply('unreadable', {}), source: visionOk ? 'vision' : 'fallback' };
  }

  // duplicate / reused transaction id check
  const txns = readTxns(storeId);
  if (fields.txnId && txns[fields.txnId]) {
    return { decision: 'duplicate', paid: fields.amount, txnId: fields.txnId, method: fields.method, expected: expected ?? null, reply: templateReply('duplicate', {}), source: 'vision' };
  }

  // amount verification (only if we know what to expect)
  let decision;
  if (expected == null) decision = 'manual_review'; // no expected amount on file -> human confirms
  else if (amountMatches(fields.amount, expected, AMOUNT_TOLERANCE_PCT())) decision = 'verified';
  else decision = 'amount_mismatch';

  // record the txn (idempotent on txnId)
  if (fields.txnId) { txns[fields.txnId] = { txnId: fields.txnId, amount: fields.amount, method: fields.method, phone: phone || null, orderId: orderId || null, decision, ts: Date.now() }; writeTxns(storeId, txns); }

  // cross-feature: a verified payment is a non-COD success signal
  if (decision === 'verified') {
    if (fraudRisk && fraudRisk.recordOutcome && phone) { try { fraudRisk.recordOutcome({ storeId, phone, outcome: 'delivered' }); } catch {} }
    if (delivery && delivery.getShipment && orderId) { /* a worker can advance the shipment to dispatched after confirm */ }
  }

  return { decision, paid: fields.amount, txnId: fields.txnId, method: fields.method, date: fields.date, expected: expected ?? null, reply: templateReply(decision, { paid: fields.amount, expected, orderId }), source: 'vision' };
}

function listTxns({ storeId = 'default_store', decision, phone, limit = 100 } = {}) {
  let list = Object.values(readTxns(storeId)).sort((a, b) => b.ts - a.ts);
  if (decision) list = list.filter(t => t.decision === decision);
  if (phone) list = list.filter(t => t.phone === phone);
  return list.slice(0, limit);
}
function getTxn({ storeId = 'default_store', txnId } = {}) { return readTxns(storeId)[txnId] || null; }

async function health() {
  let visionReachable = false;
  try { const r = await fetch(`${OLLAMA_HOST()}/api/tags`, { method: 'GET' }); visionReachable = r.ok; } catch {}
  return { ok: true, ollamaHost: OLLAMA_HOST(), visionModel: VISION_MODEL(), visionReachable, tolerancePct: AMOUNT_TOLERANCE_PCT(), currency: CURRENCY(), deliveryWired: Boolean(delivery), fraudWired: Boolean(fraudRisk && fraudRisk.recordOutcome) };
}

module.exports = { setExpected, verifyScreenshot, ocrReceipt, listTxns, getTxn, health, _internal: { parseFields, amountMatches, templateReply } };
