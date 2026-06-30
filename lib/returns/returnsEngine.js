// lib/returns/returnsEngine.js
// ────────────────────────────────────────────────────────────────────
// AI Returns & Refund (RMA) Handler. Returns are inevitable; handling them well
// (fast, fair, on-policy) keeps customers without bleeding margin. This opens a
// return request, checks eligibility against an OWNER-SET policy (return window,
// eligible reasons, non-returnable items, restocking fee), auto-decides within
// the rules or routes edge cases to a human, and tracks the RMA lifecycle.
//
// The eligibility decision is a pure deterministic function (it can NEVER auto-
// approve outside the window or for a non-returnable item); the AI Brain Bridge
// (self-hosted Ollama) only phrases the customer reply. On refund it records the
// outcome to fraud-risk (#58) and reverses any loyalty points (#60). File-backed.
// Zero new npm dependencies.
// ────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let processPrompt;
try { ({ processPrompt } = require('../../ai/aiBrain')); }
catch (e) { console.warn('[returns] aiBrain unavailable:', e.message); processPrompt = null; }

let fraudRisk = null; try { fraudRisk = require('../fraudRisk/fraudRisk'); } catch {}
let loyalty = null; try { loyalty = require('../loyalty/loyaltyEngine'); } catch {}

const MODEL = () => process.env.RETURNS_MODEL || process.env.SUPPORT_AGENT_MODEL || 'qwen2.5:32b';
const CURRENCY = () => process.env.ORDER_CURRENCY || 'PKR';

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'returns');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const rmaFile = (storeId) => path.join(DATA_DIR, `${storeId}_rma.json`);
const policyFile = (storeId) => path.join(DATA_DIR, `${storeId}_policy.json`);

function readJSON(p, fb) { try { return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : fb; } catch { return fb; } }
function writeJSON(p, d) { try { fs.writeFileSync(p, JSON.stringify(d, null, 2)); } catch (e) { console.error('[returns] write failed:', e.message); } }

const DEFAULT_POLICY = {
  windowDays: 7,                                  // returns accepted within N days of delivery
  eligibleReasons: ['defective', 'wrong_item', 'damaged', 'not_as_described', 'changed_mind'],
  autoApproveReasons: ['defective', 'wrong_item', 'damaged', 'not_as_described'], // these auto-approve if in window
  reviewReasons: ['changed_mind'],                // these go to a human even if in window
  nonReturnable: [],                              // product names that can never be returned (norm)
  restockingFeePct: 0,                            // fee deducted from refund (e.g. for change-of-mind)
  requirePhotoForDamage: true
};
function getPolicy(storeId) { return readJSON(policyFile(storeId), JSON.parse(JSON.stringify(DEFAULT_POLICY))); }
function setPolicy(storeId, updates = {}) {
  const cur = getPolicy(storeId);
  const m = { ...cur, ...updates };
  if (updates.nonReturnable) m.nonReturnable = updates.nonReturnable.map(s => String(s).toLowerCase().trim());
  writeJSON(policyFile(storeId), m);
  return m;
}

function readRMA(storeId) { return readJSON(rmaFile(storeId), {}); }
function writeRMA(storeId, d) { writeJSON(rmaFile(storeId), d); }
function norm(s) { return String(s || '').toLowerCase().trim().replace(/\s+/g, ' '); }

// ── Deterministic eligibility decision (safety-critical) ───────────────────
/**
 * Decide eligibility. Pure function. Returns { decision:'approve'|'deny'|'review', reason, refundPct }.
 * Guarantees: out-of-window or non-returnable -> deny; review-reasons -> review (never silent approve).
 */
function decideEligibility({ policy, product, reason, deliveredAt, now = Date.now(), hasPhoto = false }) {
  const reasons = [];
  // non-returnable item
  if (product && (policy.nonReturnable || []).includes(norm(product))) {
    return { decision: 'deny', reason: 'item is non-returnable', refundPct: 0 };
  }
  // window check
  if (deliveredAt != null) {
    const days = (now - deliveredAt) / 86400000;
    if (days > policy.windowDays) return { decision: 'deny', reason: `outside ${policy.windowDays}-day return window`, refundPct: 0 };
  }
  // reason eligibility
  if (reason && !policy.eligibleReasons.includes(reason)) {
    return { decision: 'deny', reason: `reason \"${reason}\" not eligible`, refundPct: 0 };
  }
  // damage may require a photo
  if (policy.requirePhotoForDamage && (reason === 'damaged' || reason === 'defective') && !hasPhoto) {
    return { decision: 'review', reason: 'photo required for damage/defect claim', refundPct: 100 };
  }
  // human-review reasons (e.g. change of mind)
  if ((policy.reviewReasons || []).includes(reason)) {
    const fee = policy.restockingFeePct || 0;
    return { decision: 'review', reason: 'requires approval (change of mind / discretionary)', refundPct: 100 - fee };
  }
  // auto-approve reasons within window
  if ((policy.autoApproveReasons || []).includes(reason)) {
    return { decision: 'approve', reason: 'eligible and auto-approved', refundPct: 100 };
  }
  // default: route to human
  return { decision: 'review', reason: 'manual review', refundPct: 100 - (policy.restockingFeePct || 0) };
}

// ── Phrasing ─────────────────────────────────────────────
function templateReply(decision, det) {
  switch (decision) {
    case 'approve': return `\u2705 Your return is approved. Please send the item back and we\'ll refund ${det.refundPct}% once received. We\'ll share return instructions now.`;
    case 'deny': return `I\'m sorry, this return doesn\'t qualify (${det.reason}). Let me know if I can help another way. \ud83d\ude4f`;
    case 'review': return `Thanks for the details \u2014 I\'ve sent your return request to our team for a quick review. We\'ll get back to you shortly. \ud83d\ude4f`;
    default: return 'Your return request has been recorded.';
  }
}
async function phrase(decision, det) {
  if (!processPrompt) return templateReply(decision, det);
  const intent = { approve: `Tell the customer their return is approved, ${det.refundPct}% refund on receipt, friendly.`, deny: `Gently explain the return doesn\'t qualify because: ${det.reason}. Stay kind.`, review: 'Tell the customer their request is under quick review and the team will follow up. Reassuring.' }[decision];
  const prompt = ['Write ONE short, empathetic WhatsApp reply for a return request. ' + intent, 'Match the customer\'s language (English/Urdu/Roman Urdu). Return ONLY the message.'].join('\n');
  try {
    const raw = await processPrompt(prompt, { model: MODEL() });
    if (!raw || /\[AI Assist\]|Connect your .* in the environment/i.test(raw)) return templateReply(decision, det);
    return String(raw).trim().replace(/^"|"$/g, '');
  } catch { return templateReply(decision, det); }
}

// ── Public flow ────────────────────────────────────────────
/**
 * Open a return request and get an instant on-policy decision.
 * @returns {Promise<{ rmaId, decision, refundPct, reason, status, reply, source }>}
 */
async function openReturn({ storeId = 'default_store', orderId, phone, product, reason, deliveredAt, hasPhoto = false, value } = {}) {
  if (!phone || !reason) throw new Error('phone and reason are required');
  const policy = getPolicy(storeId);
  const det = decideEligibility({ policy, product, reason, deliveredAt, hasPhoto });
  const rmaId = 'RMA' + crypto.randomUUID().slice(0, 8).toUpperCase();
  const status = det.decision === 'approve' ? 'approved' : (det.decision === 'deny' ? 'denied' : 'review');
  const rec = { rmaId, storeId, orderId: orderId || null, phone, product: product || null, reason, value: value || null, refundPct: det.refundPct, decision: det.decision, status, hasPhoto: Boolean(hasPhoto), createdAt: Date.now(), history: [{ status, ts: Date.now(), note: det.reason }] };
  const all = readRMA(storeId); all[rmaId] = rec; writeRMA(storeId, all);
  const reply = await phrase(det.decision, det);
  return { rmaId, decision: det.decision, refundPct: det.refundPct, reason: det.reason, status, reply, source: processPrompt ? 'ollama' : 'fallback' };
}

/** Human decision on a review-status RMA (approve/deny with optional refundPct override). */
function decide({ storeId = 'default_store', rmaId, decision, refundPct } = {}) {
  if (!rmaId || !['approve', 'deny'].includes(decision)) throw new Error('rmaId and decision(approve|deny) required');
  const all = readRMA(storeId); const r = all[rmaId];
  if (!r) return { ok: false, error: 'RMA not found' };
  if (r.status === 'refunded' || r.status === 'denied') return { ok: false, error: `already ${r.status}` };
  r.status = decision === 'approve' ? 'approved' : 'denied';
  r.decision = decision;
  if (refundPct != null) r.refundPct = Math.max(0, Math.min(100, refundPct));
  r.history.push({ status: r.status, ts: Date.now(), note: 'human decision' });
  all[rmaId] = r; writeRMA(storeId, all);
  return { ok: true, rmaId, status: r.status, refundPct: r.refundPct };
}

/** Mark the returned item received (gate before refund). */
function markReceived({ storeId = 'default_store', rmaId } = {}) {
  const all = readRMA(storeId); const r = all[rmaId];
  if (!r) return { ok: false, error: 'RMA not found' };
  if (r.status !== 'approved') return { ok: false, error: `cannot receive an RMA in status ${r.status}` };
  r.status = 'received'; r.history.push({ status: 'received', ts: Date.now() });
  all[rmaId] = r; writeRMA(storeId, all);
  return { ok: true, rmaId, status: r.status };
}

/**
 * Process the refund (after received). Records the RTO/return outcome to
 * fraud-risk (#58) and reverses loyalty points earned on the order (#60).
 */
function refund({ storeId = 'default_store', rmaId } = {}) {
  const all = readRMA(storeId); const r = all[rmaId];
  if (!r) return { ok: false, error: 'RMA not found' };
  if (r.status !== 'received' && r.status !== 'approved') return { ok: false, error: `cannot refund an RMA in status ${r.status}` };
  const refundValue = r.value != null ? +(r.value * (r.refundPct / 100)).toFixed(2) : null;
  r.status = 'refunded'; r.refundValue = refundValue; r.refundedAt = Date.now();
  r.history.push({ status: 'refunded', ts: Date.now(), refundValue });
  all[rmaId] = r; writeRMA(storeId, all);

  // cross-feature side effects (best-effort)
  if (fraudRisk && fraudRisk.recordOutcome) { try { fraudRisk.recordOutcome({ storeId, phone: r.phone, outcome: 'returned' }); } catch {} }
  if (loyalty && loyalty.balance && loyalty.redeem && r.value) {
    // reverse points earned on this order (best-effort; clamp to balance)
    try {
      const bal = loyalty.balance({ storeId, phone: r.phone });
      const toReverse = Math.min(bal.points || 0, Math.round(r.value)); // 1pt/unit default
      if (toReverse > 0) loyalty.redeem({ storeId, phone: r.phone, points: toReverse });
    } catch {}
  }
  return { ok: true, rmaId, status: 'refunded', refundValue, currency: CURRENCY() };
}

function getRMA({ storeId = 'default_store', rmaId } = {}) { return readRMA(storeId)[rmaId] || null; }
function listRMA({ storeId = 'default_store', status, phone } = {}) {
  let list = Object.values(readRMA(storeId)).sort((a, b) => b.createdAt - a.createdAt);
  if (status) list = list.filter(r => r.status === status);
  if (phone) list = list.filter(r => r.phone === phone);
  return list;
}
function stats({ storeId = 'default_store' } = {}) {
  const list = Object.values(readRMA(storeId));
  return { total: list.length, approved: list.filter(r => r.status === 'approved').length, denied: list.filter(r => r.status === 'denied').length, review: list.filter(r => r.status === 'review').length, refunded: list.filter(r => r.status === 'refunded').length };
}

function health() { return { ok: true, brainBridge: Boolean(processPrompt), model: MODEL(), fraudWired: Boolean(fraudRisk && fraudRisk.recordOutcome), loyaltyWired: Boolean(loyalty && loyalty.redeem), currency: CURRENCY() }; }

module.exports = { openReturn, decide, markReceived, refund, getRMA, listRMA, stats, getPolicy, setPolicy, health, _internal: { decideEligibility, templateReply, norm, DEFAULT_POLICY } };
