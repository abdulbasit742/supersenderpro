'use strict';
/**
 * fulfillment.js — Payments & Billing Feature #1: actually DO something when payment succeeds.
 *
 * The gap: `paymentGateway.verifyWebhook()` only checks the signature and the route returned
 * { ok:true } — nothing marked the order paid or activated the plan. So a customer could pay and get
 * nothing. This module closes that: given a VERIFIED payment event, it records the payment, marks the
 * order paid, and activates the plan/subscription — exactly once per event (idempotent).
 *
 * It stays decoupled from the rest of the app via injected hooks:
 *   setHooks({
 *     activatePlan(ctx),      // turn the plan on for the customer
 *     markOrderPaid(ctx),     // flip your order/txn record to paid
 *     notifyCustomer(ctx)     // (optional) send the WhatsApp receipt
 *   })
 * Any hook may be omitted; fulfillment still records the payment and stays idempotent.
 *
 * Storage: JSON (data/payments_fulfilled.json) for the idempotency ledger, matching the app.
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'payments_fulfilled.json');

function load() {
  try {
    return fs.existsSync(DATA_FILE)
      ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
      : { fulfilled: {} };
  } catch {
    return { fulfilled: {} };
  }
}
function save(d) {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2));
  } catch { /* best-effort */ }
}

const nowIso = () => new Date().toISOString();

let hooks = { activatePlan: null, markOrderPaid: null, notifyCustomer: null };
function setHooks(h = {}) {
  hooks = {
    activatePlan:   typeof h.activatePlan === 'function'   ? h.activatePlan   : null,
    markOrderPaid:  typeof h.markOrderPaid === 'function'  ? h.markOrderPaid  : null,
    notifyCustomer: typeof h.notifyCustomer === 'function' ? h.notifyCustomer : null
  };
  return hooks;
}

/**
 * Normalise a gateway-specific webhook payload into a common shape.
 * Returns null if this event is not a successful payment we should act on.
 */
function parseEvent(gateway, payload) {
  const gw = String(gateway || '').toLowerCase();
  if (gw === 'stripe') {
    // We only fulfill on a completed checkout / successful payment.
    const type = payload?.type;
    if (!['checkout.session.completed', 'payment_intent.succeeded'].includes(type)) return null;
    const obj = payload?.data?.object || {};
    const md = obj.metadata || {};
    return {
      eventId: payload.id || obj.id,
      gateway: 'stripe',
      amount: (obj.amount_total != null ? obj.amount_total : obj.amount) / 100,
      currency: (obj.currency || 'pkr').toUpperCase(),
      customerEmail: obj.customer_email || obj.customer_details?.email || null,
      planId: md.planId || null,
      orderId: md.orderId || null,
      customerPhone: md.customerPhone || null,
      raw: obj
    };
  }
  // Local gateway (JazzCash/EasyPaisa/bank): expect a normalised admin-confirmed event.
  if (gw === 'local') {
    if (payload?.status && String(payload.status).toLowerCase() !== 'paid') return null;
    return {
      eventId: payload.eventId || payload.paymentRef,
      gateway: 'local',
      amount: Number(payload.amount || 0),
      currency: (payload.currency || 'PKR').toUpperCase(),
      customerEmail: payload.customerEmail || null,
      planId: payload.planId || null,
      orderId: payload.orderId || payload.paymentRef || null,
      customerPhone: payload.customerPhone || null,
      raw: payload
    };
  }
  return null;
}

function alreadyFulfilled(eventId) {
  if (!eventId) return false;
  return !!load().fulfilled[eventId];
}

/**
 * Fulfill a VERIFIED payment event. Caller MUST verify the signature first
 * (paymentGateway.verifyWebhook) — this function assumes authenticity.
 *
 * @returns {Promise<{ok, status, eventId, ...}>}
 *   status: 'fulfilled' | 'duplicate' | 'ignored'
 */
async function fulfill(gateway, payload) {
  const ev = parseEvent(gateway, payload);
  if (!ev) return { ok: true, status: 'ignored', reason: 'not a successful payment event' };
  if (!ev.eventId) return { ok: false, status: 'ignored', reason: 'event has no id (cannot dedupe)' };

  // Idempotency: never act twice on the same event.
  if (alreadyFulfilled(ev.eventId)) {
    return { ok: true, status: 'duplicate', eventId: ev.eventId };
  }

  const ctx = {
    eventId: ev.eventId,
    gateway: ev.gateway,
    amount: ev.amount,
    currency: ev.currency,
    planId: ev.planId,
    orderId: ev.orderId,
    customerEmail: ev.customerEmail,
    customerPhone: ev.customerPhone,
    at: nowIso()
  };

  const steps = {};
  try {
    if (hooks.markOrderPaid) { await hooks.markOrderPaid(ctx); steps.orderPaid = true; }
    if (hooks.activatePlan)  { await hooks.activatePlan(ctx);  steps.planActivated = true; }
    if (hooks.notifyCustomer){ await hooks.notifyCustomer(ctx); steps.notified = true; }
  } catch (err) {
    // Do NOT mark fulfilled if a hook failed — lets the gateway retry the webhook.
    return { ok: false, status: 'error', eventId: ev.eventId, error: err.message, steps };
  }

  // Record success (idempotency ledger).
  const data = load();
  data.fulfilled[ev.eventId] = { ...ctx, steps };
  save(data);

  return { ok: true, status: 'fulfilled', eventId: ev.eventId, steps, ...ctx };
}

function getFulfillment(eventId) {
  return load().fulfilled[eventId] || null;
}

function listFulfillments(limit = 100) {
  const rows = Object.values(load().fulfilled);
  rows.sort((a, b) => new Date(b.at) - new Date(a.at));
  return rows.slice(0, Math.min(Number(limit) || 100, 1000));
}

module.exports = {
  setHooks,
  parseEvent,
  alreadyFulfilled,
  fulfill,
  getFulfillment,
  listFulfillments
};
