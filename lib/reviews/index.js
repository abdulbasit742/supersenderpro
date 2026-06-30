'use strict';
// #77 Reviews & Ratings — barrel + high-level helpers.
const config = require('./config');
const store = require('./store');
const privacy = require('./privacy');
const moderation = require('./moderation');
const aggregate = require('./aggregate');
const doctor = require('./doctor');

function submit(args) { const db = store.load(); const res = moderation.submit(db, args); store.save(db); return res; }
function moderate(args) { const db = store.load(); const res = moderation.setStatus(db, args); store.save(db); return res; }
function product(tenantId, productId) { const db = store.load(); return aggregate.forProduct(db, tenantId, productId); }
function top(tenantId, limit) { const db = store.load(); return aggregate.topProducts(db, tenantId, limit); }

// Hook: when an order is delivered, you can prompt for a review (advisory — does not send).
function onOrderDelivered(evt) {
  if (!config.enabled) return { skipped: 'disabled' };
  return { advisory: true, prompt: { tenantId: evt.tenantId, contactId: evt.contactId, productId: evt.productId, orderId: evt.orderId }, note: 'wire a notifier to actually send the review request' };
}
module.exports = { config, store, privacy, moderation, aggregate, doctor, submit, moderate, product, top, onOrderDelivered };
