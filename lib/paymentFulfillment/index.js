// lib/paymentFulfillment/index.js — Payments & Billing fulfillment bridge (barrel export).
//
// Closes the gap between "payment captured" (lib/paymentGateway) and "value delivered"
// (lib/saasBilling): on a VERIFIED payment it marks the invoice paid, activates/renews the
// tenant license, issues a receipt, and schedules renewal + dunning reminders.
//
// SAFETY: dry-run by default (PAYMENT_FULFILLMENT_DRY_RUN=true). Shared billing/license state
// is only mutated when PAYMENT_FULFILLMENT_LIVE=true AND dry-run is off. Receipts + reminders
// are draft-only until PAYMENT_FULFILLMENT_LIVE_NOTIFICATIONS=true and a notifier is wired via
// require('./lib/paymentFulfillment').setNotifier(fn).

const { config } = require('./config');
const notify = require('./notify');

module.exports = {
 config,
 store: require('./store'),
 notify,
 idempotency: require('./idempotency'),
 receiptBuilder: require('./receiptBuilder'),
 reminderScheduler: require('./reminderScheduler'),
 fulfillmentEngine: require('./fulfillmentEngine'),
 webhookHandlers: require('./webhookHandlers'),
 checkoutOrchestrator: require('./checkoutOrchestrator'),
 doctor: require('./doctor'),
 setNotifier: notify.setNotifier,
};
