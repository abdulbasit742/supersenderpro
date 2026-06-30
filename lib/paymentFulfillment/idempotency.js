// lib/paymentFulfillment/idempotency.js — Dedupe payment events so a re-delivered
// webhook (Stripe retries aggressively) never fulfills twice. Keyed by gateway + event id
// + payment reference.

const store = require('./store');

function key(gateway, eventId, paymentRef) {
 return [gateway || '', eventId || '', paymentRef || ''].join(':');
}
function seen(k) { return store.load().processedEvents.some((e) => e.key === k); }
function getRecord(k) { return store.load().processedEvents.find((e) => e.key === k) || null; }
function mark(k, result) {
 const d = store.load();
 if (!d.processedEvents.some((e) => e.key === k)) {
 d.processedEvents.push({ key: k, at: store.nowIso(), fulfillmentId: (result && result.fulfillmentId) || null });
 store.save(d);
 }
 return k;
}

module.exports = { key, seen, getRecord, mark };
