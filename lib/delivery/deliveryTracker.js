// lib/delivery/deliveryTracker.js
// ────────────────────────────────────────────────────────────────────
// AI Delivery Tracking + Proactive Notifications. \"Where is my order?\" is the #1
// support question, and silence after purchase kills trust. This tracks each
// shipment through a status lifecycle, proactively messages the customer on
// every transition (so they never have to ask), detects stuck shipments past
// SLA, and phrases friendly status/ETA updates via the AI Brain Bridge (Ollama).
//
// Lifecycle + SLA detection are deterministic; the model only phrases the
// update. On delivery it can trigger a review request (#38) and tell fraud-risk
// (#58) the COD outcome; on return it records the RTO. File-backed. Zero deps.
// ────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

let processPrompt;
try { ({ processPrompt } = require('../../ai/aiBrain')); }
catch (e) { console.warn('[delivery] aiBrain unavailable:', e.message); processPrompt = null; }

// optional cross-feature hooks (best-effort)
let fraudRisk = null; try { fraudRisk = require('../fraudRisk/fraudRisk'); } catch {}
let reviews = null; try { reviews = require('../reviews/reviewCollector'); } catch {}

const MODEL = () => process.env.DELIVERY_MODEL || process.env.SUPPORT_AGENT_MODEL || 'qwen2.5:32b';

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'delivery');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const shipFile = (storeId) => path.join(DATA_DIR, `${storeId}_shipments.json`);
const configFile = (storeId) => path.join(DATA_DIR, `${storeId}_config.json`);

function readJSON(p, fb) { try { return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : fb; } catch { return fb; } }
function writeJSON(p, d) { try { fs.writeFileSync(p, JSON.stringify(d, null, 2)); } catch (e) { console.error('[delivery] write failed:', e.message); } }

// Lifecycle: forward order matters; failed/returned are terminal-ish branches.
const FLOW = ['created', 'dispatched', 'in_transit', 'out_for_delivery', 'delivered'];
const TERMINAL = ['delivered', 'returned', 'cancelled'];

const DEFAULT_CONFIG = {
  // max hours allowed in each status before it\'s considered \"stuck\"
  slaHours: { created: 24, dispatched: 48, in_transit: 72, out_for_delivery: 24 },
  notifyOn: ['dispatched', 'out_for_delivery', 'delivered', 'failed', 'returned'], // statuses that message the customer
  requestReviewOnDelivered: true
};
function getConfig(storeId) { return readJSON(configFile(storeId), { ...DEFAULT_CONFIG }); }
function setConfig(storeId, updates = {}) { const m = { ...getConfig(storeId), ...updates }; if (updates.slaHours) m.slaHours = { ...getConfig(storeId).slaHours, ...updates.slaHours }; writeJSON(configFile(storeId), m); return m; }

function readShip(storeId) { return readJSON(shipFile(storeId), {}); }
function writeShip(storeId, d) { writeJSON(shipFile(storeId), d); }

// ── Create ──────────────────────────────────────────────────
function createShipment({ storeId = 'default_store', orderId, phone, items, courier, trackingId, etaISO } = {}) {
  if (!orderId || !phone) throw new Error('orderId and phone are required');
  const ship = readShip(storeId);
  if (ship[orderId]) return { ok: false, error: 'shipment already exists', shipment: ship[orderId] };
  const now = Date.now();
  const rec = { orderId, phone, items: items || [], courier: courier || null, trackingId: trackingId || null, status: 'created', etaISO: etaISO || null, statusSince: now, createdAt: now, history: [{ status: 'created', ts: now }], pendingNotify: false };
  ship[orderId] = rec; writeShip(storeId, ship);
  return { ok: true, shipment: rec };
}

// ── Update status ────────────────────────────────────────────
const KNOWN = new Set([...FLOW, 'failed', 'returned', 'cancelled']);

/**
 * Advance/Set a shipment\'s status. Records history, flags a pending customer
 * notification when the config says so, and fires cross-feature hooks on
 * delivered/returned. Returns the shipment + a notification (if one is due now).
 */
async function updateStatus({ storeId = 'default_store', orderId, status, note, etaISO } = {}) {
  if (!orderId || !status) throw new Error('orderId and status are required');
  if (!KNOWN.has(status)) throw new Error(`unknown status \"${status}\"`);
  const ship = readShip(storeId);
  const rec = ship[orderId];
  if (!rec) return { ok: false, error: 'shipment not found' };
  if (TERMINAL.includes(rec.status)) return { ok: false, error: `shipment already ${rec.status}` };

  const now = Date.now();
  rec.status = status; rec.statusSince = now; rec.note = note || null;
  if (etaISO) rec.etaISO = etaISO;
  rec.history.push({ status, ts: now, note: note || null });

  const cfg = getConfig(storeId);
  let notification = null;
  if (cfg.notifyOn.includes(status)) {
    const message = await phraseUpdate(rec, status);
    rec.pendingNotify = true; rec.lastNotifyText = message;
    notification = { phone: rec.phone, orderId, status, message };
  }

  // cross-feature hooks (best-effort, never block)
  if (status === 'delivered') {
    if (fraudRisk && fraudRisk.recordOutcome) { try { fraudRisk.recordOutcome({ storeId, phone: rec.phone, outcome: 'delivered' }); } catch {} }
    if (cfg.requestReviewOnDelivered && reviews && reviews.requestReview) { try { reviews.requestReview({ storeId, phone: rec.phone, orderId }); } catch {} }
  } else if (status === 'returned') {
    if (fraudRisk && fraudRisk.recordOutcome) { try { fraudRisk.recordOutcome({ storeId, phone: rec.phone, outcome: 'returned' }); } catch {} }
  } else if (status === 'cancelled') {
    if (fraudRisk && fraudRisk.recordOutcome) { try { fraudRisk.recordOutcome({ storeId, phone: rec.phone, outcome: 'cancelled' }); } catch {} }
  }

  ship[orderId] = rec; writeShip(storeId, ship);
  return { ok: true, shipment: rec, notification };
}

// ── Message phrasing ────────────────────────────────────────
function etaText(etaISO) {
  if (!etaISO) return '';
  try { const d = new Date(etaISO); return ` ETA ${d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}`; } catch { return ''; }
}
function templateUpdate(rec, status) {
  const t = rec.trackingId ? ` (tracking ${rec.trackingId}${rec.courier ? ' / ' + rec.courier : ''})` : '';
  switch (status) {
    case 'dispatched': return `\ud83d\udce6 Good news! Your order has been dispatched${t}.${etaText(rec.etaISO)}`;
    case 'out_for_delivery': return `\ud83d\ude9a Your order is out for delivery today! Please keep your phone handy.`;
    case 'delivered': return `\u2705 Your order has been delivered. Thank you for shopping with us! \ud83d\ude4f`;
    case 'failed': return `\u26a0\ufe0f We tried to deliver your order but couldn\'t reach you. We\'ll try again — reply to reschedule.`;
    case 'returned': return `Your order is on its way back to us. Reply if you\'d like to re-order or need help.`;
    default: return `Update on your order: ${status}.`;
  }
}
async function phraseUpdate(rec, status) {
  if (!processPrompt) return templateUpdate(rec, status);
  const prompt = [
    'Write ONE short, friendly WhatsApp delivery update. 1-2 lines.',
    `Status: ${status}.${rec.trackingId ? ` Tracking: ${rec.trackingId}${rec.courier ? ' via ' + rec.courier : ''}.` : ''}${rec.etaISO ? ` ETA: ${rec.etaISO}.` : ''}`,
    'Warm and reassuring. Match the customer\'s likely language (English/Urdu/Roman Urdu). Return ONLY the message.'
  ].join('\n');
  try {
    const raw = await processPrompt(prompt, { model: MODEL() });
    if (!raw || /\[AI Assist\]|Connect your .* in the environment/i.test(raw)) return templateUpdate(rec, status);
    return String(raw).trim().replace(/^"|"$/g, '');
  } catch { return templateUpdate(rec, status); }
}

// ── Stuck detection ─────────────────────────────────────────
function stuckShipments({ storeId = 'default_store', now = Date.now() } = {}) {
  const ship = readShip(storeId); const cfg = getConfig(storeId);
  const out = [];
  for (const id of Object.keys(ship)) {
    const r = ship[id];
    if (TERMINAL.includes(r.status)) continue;
    const sla = cfg.slaHours[r.status];
    if (!sla) continue;
    const hoursInStatus = (now - r.statusSince) / 3600000;
    if (hoursInStatus > sla) out.push({ orderId: id, phone: r.phone, status: r.status, hoursInStatus: Math.round(hoursInStatus), slaHours: sla, courier: r.courier, trackingId: r.trackingId });
  }
  return out.sort((a, b) => b.hoursInStatus - a.hoursInStatus);
}

// ── Notifications queue ────────────────────────────────────────
function dueNotifications({ storeId = 'default_store' } = {}) {
  const ship = readShip(storeId);
  return Object.values(ship).filter(r => r.pendingNotify).map(r => ({ orderId: r.orderId, phone: r.phone, status: r.status, message: r.lastNotifyText }));
}
function markNotified({ storeId = 'default_store', orderId } = {}) {
  const ship = readShip(storeId); const r = ship[orderId];
  if (r) { r.pendingNotify = false; writeShip(storeId, ship); }
  return { ok: Boolean(r) };
}

function getShipment({ storeId = 'default_store', orderId } = {}) { return readShip(storeId)[orderId] || null; }
function listShipments({ storeId = 'default_store', status } = {}) {
  let list = Object.values(readShip(storeId)).sort((a, b) => b.createdAt - a.createdAt);
  if (status) list = list.filter(s => s.status === status);
  return list;
}

/** Customer-facing \"where is my order\" answer for the support agent. */
async function trackForCustomer({ storeId = 'default_store', orderId } = {}) {
  const r = getShipment({ storeId, orderId });
  if (!r) return { found: false, message: 'I couldn\'t find that order. Could you share your order number?' };
  return { found: true, status: r.status, etaISO: r.etaISO, message: await phraseUpdate(r, r.status) };
}

function health() { return { ok: true, brainBridge: Boolean(processPrompt), model: MODEL(), fraudWired: Boolean(fraudRisk && fraudRisk.recordOutcome), reviewsWired: Boolean(reviews && reviews.requestReview) }; }

module.exports = { createShipment, updateStatus, stuckShipments, dueNotifications, markNotified, getShipment, listShipments, trackForCustomer, getConfig, setConfig, health, _internal: { FLOW, TERMINAL, templateUpdate, DEFAULT_CONFIG } };
