'use strict';
// #71 Loyalty & Points — barrel.
const config = require('./config');
const store = require('./store');
const privacy = require('./privacy');
const pointsEngine = require('./pointsEngine');
const tierEngine = require('./tierEngine');
const redemption = require('./redemption');
const doctor = require('./doctor');

// High-level helpers that load+save the store for you.
function balance(tenantId, contactId) {
  const db = store.load();
  const acct = store.getAccount(db, tenantId, contactId);
  const tier = tierEngine.tierFor(acct.lifetimeEarned);
  const next = tierEngine.nextTier(acct.lifetimeEarned);
  return { account: acct, tier, next };
}

function earn(args) {
  const db = store.load();
  const res = pointsEngine.earn(db, args);
  store.save(db);
  return res;
}

function redeem(args) {
  const db = store.load();
  const res = pointsEngine.redeem(db, args);
  store.save(db);
  return res;
}

function adjust(args) {
  const db = store.load();
  const res = pointsEngine.adjust(db, args);
  store.save(db);
  return res;
}

// React to an order.paid event (called by webhook ingestion #51 / order mgmt #63 if wired).
function onOrderPaid(evt) {
  if (!config.enabled) return { skipped: 'disabled' };
  const { tenantId, contactId, amount, orderId } = evt || {};
  if (!contactId || !amount) return { skipped: 'missing_fields' };
  return earn({ tenantId, contactId, amount, orderId, reason: 'order.paid' });
}

module.exports = { config, store, privacy, pointsEngine, tierEngine, redemption, doctor, balance, earn, redeem, adjust, onOrderPaid };
