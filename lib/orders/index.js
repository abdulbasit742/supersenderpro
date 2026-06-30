// lib/orders/index.js — Order Management (barrel export).
//
// Build an order from line items with coupon-aware totals (subtotal -> discount via #59 -> tax ->
// shipping -> total), place it, and move it through a guarded status flow
// (draft -> pending -> paid -> fulfilled -> delivered, plus cancelled/refunded). markPaid() links a
// payment ref, redeems the coupon (#59, idempotent), and records a payment event in customer 360
// (#46). Each status change fires a (draft-only, consent-gated) customer message.
//
// SAFETY: JSON-backed; this module computes + tracks orders, it NEVER charges (payments #1 owns
// money) and never sends directly until ORDERS_LIVE_MESSAGES=true + a notifier is wired. Illegal
// status jumps are blocked. Contacts masked in views. Orders cancelled/refunded, never hard-deleted.

const { config, STATUSES, TRANSITIONS } = require('./config');
const notify = require('./notify');

module.exports = {
 config, STATUSES, TRANSITIONS,
 store: require('./store'),
 privacy: require('./privacy'),
 totals: require('./totals'),
 notify,
 orderEngine: require('./orderEngine'),
 doctor: require('./doctor'),
 setNotifier: notify.setNotifier,
};
