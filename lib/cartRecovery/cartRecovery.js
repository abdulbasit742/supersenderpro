// lib/cartRecovery/cartRecovery.js
// ────────────────────────────────────────────────────────────────────
// AI Abandoned-Cart Recovery. A customer described an order (see order
// extraction, #25) but never said CONFIRM — that's an abandoned cart, and on
// WhatsApp it's highly recoverable with one good nudge. This detects stalled
// draft orders, drafts a PERSONALIZED win-back message from the customer's
// actual cart (via the AI Brain Bridge / self-hosted Ollama), and builds a
// multi-step follow-up cadence with an optional escalating incentive.
//
// Deterministic template fallback so it works with no model. Reuses the order-
// extraction drafts and (optionally) the send-time optimizer for timing.
// File-backed recovery state. Zero new npm dependencies.
// ────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

let processPrompt;
try { ({ processPrompt } = require('../../ai/aiBrain')); }
catch (e) { console.warn('[cartRecovery] aiBrain unavailable:', e.message); processPrompt = null; }

// Optional integrations.
let sendTime = null;
try { sendTime = require('../sendTime/sendTimeOptimizer'); } catch { /* optional */ }

const MODEL = () => process.env.CART_RECOVERY_MODEL || process.env.SUPPORT_AGENT_MODEL || 'qwen2.5:32b';
const CURRENCY = () => process.env.ORDER_CURRENCY || 'PKR';
const STALL_HOURS = () => parseFloat(process.env.CART_STALL_HOURS || '2');

const DATA_ROOT = path.join(__dirname, '..', '..', 'data');
const DRAFTS_DIR = path.join(DATA_ROOT, 'orders_draft');
const DATA_DIR = path.join(DATA_ROOT, 'cart_recovery');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const stateFile = (storeId) => path.join(DATA_DIR, `${storeId}_recovery.json`);

function readJSON(p, fb) { try { return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : fb; } catch { return fb; } }
function writeJSON(p, d) { try { fs.writeFileSync(p, JSON.stringify(d, null, 2)); } catch (e) { console.error('[cartRecovery] write failed:', e.message); } }

function readState(storeId) { return readJSON(stateFile(storeId), {}); }
function writeState(storeId, d) { writeJSON(stateFile(storeId), d); }

// ── Detect stalled carts ───────────────────────────────────────────
function cartLabel(order) {
  if (!order || !order.items || !order.items.length) return 'your items';
  return order.items.map(i => `${i.qty || 1}x ${i.canonicalName || i.name}`).join(', ');
}
function cartTotal(order) {
  if (!order || !order.items) return null;
  let total = 0, all = true;
  for (const i of order.items) { if (i.unitPrice != null) total += i.unitPrice * (i.qty || 1); else all = false; }
  return all && total > 0 ? total : null;
}

/**
 * Find draft orders that have stalled (status 'draft', older than stallHours,
 * not already recovered/confirmed and not currently in an active cadence).
 */
function detectStalled({ storeId = 'default_store', stallHours = STALL_HOURS() } = {}) {
  const drafts = readJSON(path.join(DRAFTS_DIR, `${storeId}_drafts.json`), {});
  const state = readState(storeId);
  const cutoff = Date.now() - stallHours * 3600 * 1000;
  const stalled = [];
  for (const phone of Object.keys(drafts)) {
    const d = drafts[phone];
    if (!d || d.status !== 'draft') continue;
    if ((d.ts || 0) > cutoff) continue; // too fresh, give them time
    const rec = state[phone];
    if (rec && (rec.status === 'recovered' || rec.status === 'exhausted')) continue;
    stalled.push({ phone, order: d.order, total: d.total ?? cartTotal(d.order), draftId: d.id, stalledSince: d.ts });
  }
  return stalled;
}

// ── Draft a win-back message ─────────────────────────────────────
function templateMessage({ order, step, incentive }) {
  const items = cartLabel(order);
  const inc = incentive ? ` ${incentive}` : '';
  const msgs = [
    `Hi {{name}}! \ud83d\udc4b You left ${items} in your cart. Want me to complete the order?${inc} Reply CONFIRM and it's done.`,
    `Still thinking it over, {{name}}? Your ${items} is reserved.${inc} Just reply CONFIRM and I'll process it. \ud83d\ude4c`,
    `Last reminder, {{name}} — ${items} is about to be released.${inc} Reply CONFIRM to lock it in. Reply STOP to opt out.`
  ];
  return msgs[Math.min(step, msgs.length - 1)];
}

async function draftMessage({ order, step = 0, incentive = '', tone = 'friendly' } = {}) {
  const items = cartLabel(order);
  if (!processPrompt) return { text: templateMessage({ order, step, incentive }), source: 'fallback' };
  const prompt = [
    'Write a SHORT, warm WhatsApp abandoned-cart recovery message. 1-2 lines.',
    `Tone: ${tone}. This is follow-up #${step + 1} (later steps can be a touch more urgent).`,
    `The customer\'s cart: ${items}.`,
    incentive ? `Offer this incentive: ${incentive}.` : 'No discount unless necessary.',
    'Include {{name}} for personalization and a clear "reply CONFIRM" call to action.',
    'Avoid spammy words and ALL CAPS. Add "Reply STOP to opt out" only on the final nudge.',
    'Return ONLY the message.'
  ].join('\n');
  try {
    const raw = await processPrompt(prompt, { model: MODEL() });
    if (!raw || /\[AI Assist\]|Connect your .* in the environment/i.test(raw)) return { text: templateMessage({ order, step, incentive }), source: 'fallback' };
    return { text: String(raw).trim().replace(/^"|"$/g, ''), source: 'ollama' };
  } catch (err) {
    console.warn('[cartRecovery] draft failed:', err.message);
    return { text: templateMessage({ order, step, incentive }), source: 'fallback' };
  }
}

// ── Build a follow-up cadence ─────────────────────────────────────
// Default cadence: +0h (now), +24h (gentle), +72h (final, with incentive).
const DEFAULT_CADENCE_HOURS = [0, 24, 72];

function nextWhenMs({ storeId, phone, offsetHours, from = Date.now() }) {
  const base = from + offsetHours * 3600 * 1000;
  // align to the contact's best hour if the send-time optimizer is present
  if (sendTime && typeof sendTime.nextSlot === 'function') {
    try { const slot = sendTime.nextSlot({ storeId, phone, from: base }); return slot.whenMs; } catch { /* fall through */ }
  }
  return base;
}

/**
 * Build (and persist) a recovery cadence for one stalled cart.
 * @returns {Promise<{ phone, steps:[{step,whenISO,text,incentive}], status }>}
 */
async function buildCadence({ storeId = 'default_store', phone, order, total, cadenceHours = DEFAULT_CADENCE_HOURS, finalIncentive } = {}) {
  if (!phone) throw new Error('phone is required');
  const inc = finalIncentive || (total ? `Use code COMEBACK5 for 5% off ${CURRENCY()} ${total}` : 'Use code COMEBACK5 for 5% off');
  const steps = [];
  for (let i = 0; i < cadenceHours.length; i++) {
    const isFinal = i === cadenceHours.length - 1;
    const { text, source } = await draftMessage({ order, step: i, incentive: isFinal ? inc : '' });
    steps.push({ step: i, whenISO: new Date(nextWhenMs({ storeId, phone, offsetHours: cadenceHours[i] })).toISOString(), text, incentive: isFinal ? inc : null, source, sent: false });
  }
  const state = readState(storeId);
  state[phone] = { phone, order, total: total ?? cartTotal(order), steps, status: 'active', createdAt: Date.now() };
  writeState(storeId, state);
  return state[phone];
}

/**
 * Scan for stalled carts and build cadences for any not already in recovery.
 * @returns {Promise<{ stalled, started, cadences }>}
 */
async function scan({ storeId = 'default_store', stallHours = STALL_HOURS(), max = 100 } = {}) {
  const stalled = detectStalled({ storeId, stallHours });
  const state = readState(storeId);
  const started = [];
  for (const c of stalled.slice(0, max)) {
    if (state[c.phone] && state[c.phone].status === 'active') continue; // already recovering
    const cad = await buildCadence({ storeId, phone: c.phone, order: c.order, total: c.total });
    started.push({ phone: c.phone, steps: cad.steps.length });
  }
  return { stalled: stalled.length, started: started.length, cadences: started };
}

/** Mark a contact recovered (call when they CONFIRM). Stops the cadence. */
function markRecovered({ storeId = 'default_store', phone } = {}) {
  const state = readState(storeId);
  if (!state[phone]) return { ok: false, error: 'no active recovery' };
  state[phone].status = 'recovered'; state[phone].recoveredAt = Date.now();
  writeState(storeId, state);
  return { ok: true, phone, status: 'recovered' };
}

/** Mark the next pending step as sent (the queue worker calls this). */
function markStepSent({ storeId = 'default_store', phone, step } = {}) {
  const state = readState(storeId);
  const rec = state[phone];
  if (!rec) return { ok: false, error: 'no recovery' };
  const s = rec.steps.find(x => x.step === step);
  if (s) s.sent = true;
  if (rec.steps.every(x => x.sent)) rec.status = 'exhausted';
  writeState(storeId, state);
  return { ok: true, status: rec.status };
}

function listActive({ storeId = 'default_store' } = {}) {
  return Object.values(readState(storeId)).filter(r => r.status === 'active');
}

function health() {
  return { ok: true, brainBridge: Boolean(processPrompt), model: MODEL(), sendTimeWired: Boolean(sendTime && sendTime.nextSlot), stallHours: STALL_HOURS() };
}

module.exports = {
  detectStalled, draftMessage, buildCadence, scan, markRecovered, markStepSent, listActive, health,
  _internal: { cartLabel, cartTotal, templateMessage, DEFAULT_CADENCE_HOURS }
};
