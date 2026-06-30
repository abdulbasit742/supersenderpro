'use strict';
/**
 * lib/paymentGateway/fulfillment.js — Payments & Billing Feature #1: FULFILLMENT.
 *
 * The bug: `verifyWebhook()` only checks the signature and returns { verified:true }. Nothing then
 * delivers value — the order is never marked paid, no subscription is activated, no points awarded.
 * Customers pay and get nothing. This module is the missing step that runs AFTER verification.
 *
 * Responsibilities:
 *   1. Normalise a verified gateway payload (Stripe / local) into a PaymentEvent.
 *   2. Be idempotent: the same gateway event id is only fulfilled once (gateways retry webhooks).
 *   3. Mark the transaction paid in txnStore (restart-safe store from PR #33).
 *   4. Activate the purchased thing via injected hooks (order fulfillment / subscription activation),
 *      so this module doesn't hard-couple to any specific order/billing code.
 *   5. Award loyalty points + convert a pending referral on first paid order (marketing #4).
 *
 * Everything external is injected via configure(), so this stays testable and decoupled:
 *   configure({ activateOrder, activateSubscription, awardLoyalty, convertReferral })
 */

const fs = require('fs');
const path = require('path');

let txnStore = null;
try { txnStore = require('../txnStore'); } catch { txnStore = null; }

const LOG_FILE = path.join(__dirname, '..', '..', 'data', 'payment_fulfillment_log.json');

const hooks = {
  activateOrder: null,        // async ({ orderId, event }) => void
  activateSubscription: null,  // async ({ planId, customer, event }) => void
  awardLoyalty: null,          // ({ customer, amount, reason }) => void
  convertReferral: null        // ({ customer }) => void
};
function configure(opts = {}) {
  for (const k of Object.keys(hooks)) {
    if (typeof opts[k] === 'function') hooks[k] = opts[k];
  }
  return { configured: Object.keys(hooks).filter(k => hooks[k]) };
}

function readLog() {
  try { return fs.existsSync(LOG_FILE) ? JSON.parse(fs.readFileSync(LOG_FILE, 'utf8')) : { fulfilled: [] }; }
  catch { return { fulfilled: [] }; }
}
function writeLog(d) {
  try { fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true }); fs.writeFileSync(LOG_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}

// ---------------------------------------------------------------------------
// Normalise gateway payloads -> PaymentEvent
// ---------------------------------------------------------------------------
// PaymentEvent: { eventId, gateway, type, paid, amount, currency, customer:{email,phone},
//                 planId, orderId, paymentRef, raw }
function parseStripeEvent(payload) {
  // payload is the parsed JSON body of a Stripe webhook.
  const obj = payload?.data?.object || {};
  const md = obj.metadata || {};
  const paid = payload?.type === 'checkout.session.completed' || obj.payment_status === 'paid';
  return {
    eventId: payload?.id || obj.id || `stripe_${Date.now()}`,
    gateway: 'stripe',
    type: payload?.type || 'unknown',
    paid: !!paid,
    amount: obj.amount_total != null ? Number(obj.amount_total) / 100 : Number(md.amount || 0),
    currency: (obj.currency || md.currency || 'pkr').toUpperCase(),
    customer: { email: obj.customer_email || obj.customer_details?.email || md.email || null,
                phone: md.phone || null },
    planId: md.planId || null,
    orderId: md.orderId || null,
    paymentRef: obj.id || null,
    raw: payload
  };
}

function parseLocalEvent(payload) {
  // Local gateway (JazzCash/EasyPaisa/bank) confirmation — shape is our own.
  return {
    eventId: payload.eventId || payload.paymentRef || `local_${Date.now()}`,
    gateway: 'local',
    type: 'local.payment.confirmed',
    paid: payload.paid !== false, // a local confirmation means paid unless explicitly false
    amount: Number(payload.amount || 0),
    currency: (payload.currency || 'PKR').toUpperCase(),
    customer: { email: payload.email || null, phone: payload.phone || payload.customerPhone || null },
    planId: payload.planId || null,
    orderId: payload.orderId || null,
    paymentRef: payload.paymentRef || null,
    raw: payload
  };
}

function normaliseEvent(gateway, payload) {
  return gateway === 'stripe' ? parseStripeEvent(payload) : parseLocalEvent(payload);
}

// ---------------------------------------------------------------------------
// Fulfillment
// ---------------------------------------------------------------------------
function alreadyFulfilled(log, eventId) {
  return log.fulfilled.some(f => f.eventId === eventId);
}

/**
 * Fulfill a VERIFIED payment. Call this only after verifyWebhook(...) returns { verified:true }.
 * @param {string} gateway 'stripe' | 'local'
 * @param {object} payload parsed webhook body (or local confirmation object)
 * @returns {Promise<object>} result summary
 */
async function fulfillPayment(gateway, payload) {
  const event = normaliseEvent(gateway, payload);
  const log = readLog();

  // Idempotency: gateways retry. Never fulfill the same event twice.
  if (alreadyFulfilled(log, event.eventId)) {
    return { ok: true, duplicate: true, eventId: event.eventId };
  }

  if (!event.paid) {
    log.fulfilled.push({ eventId: event.eventId, gateway, status: 'ignored_not_paid', at: new Date().toISOString() });
    writeLog(log);
    return { ok: true, paid: false, eventId: event.eventId, note: 'event was not a paid event' };
  }

  const actions = [];

  // 1) mark transaction paid (restart-safe store)
  try {
    if (txnStore && event.paymentRef) {
      txnStore.setTxn(event.paymentRef, {
        status: 'paid', gateway, amount: event.amount, currency: event.currency,
        planId: event.planId, orderId: event.orderId, customer: event.customer,
        paidAt: new Date().toISOString()
      });
      actions.push('txn_marked_paid');
    }
  } catch (e) { actions.push(`txn_error:${e.message}`); }

  // 2) activate the purchased thing
  try {
    if (event.orderId && hooks.activateOrder) {
      await hooks.activateOrder({ orderId: event.orderId, event });
      actions.push('order_activated');
    }
    if (event.planId && hooks.activateSubscription) {
      await hooks.activateSubscription({ planId: event.planId, customer: event.customer, event });
      actions.push('subscription_activated');
    }
  } catch (e) { actions.push(`activate_error:${e.message}`); }

  // 3) loyalty + referral (marketing #4) — best-effort, never blocks fulfillment
  try {
    const who = event.customer?.phone || event.customer?.email;
    if (who && hooks.awardLoyalty && event.amount > 0) {
      hooks.awardLoyalty({ customer: { phone: event.customer.phone, id: who }, amount: event.amount, reason: `payment ${event.paymentRef || event.eventId}` });
      actions.push('loyalty_awarded');
    }
    if (who && hooks.convertReferral) {
      hooks.convertReferral({ customer: { phone: event.customer.phone, id: who } });
      actions.push('referral_checked');
    }
  } catch (e) { actions.push(`loyalty_error:${e.message}`); }

  log.fulfilled.push({
    eventId: event.eventId, gateway, status: 'fulfilled', actions,
    amount: event.amount, currency: event.currency, planId: event.planId, orderId: event.orderId,
    at: new Date().toISOString()
  });
  if (log.fulfilled.length > 5000) log.fulfilled = log.fulfilled.slice(-5000);
  writeLog(log);

  return { ok: true, fulfilled: true, eventId: event.eventId, actions, event };
}

function getFulfillmentLog(limit = 100) {
  const log = readLog();
  return log.fulfilled.slice(-Math.max(1, Number(limit) || 100)).reverse();
}

module.exports = { configure, normaliseEvent, fulfillPayment, getFulfillmentLog };
