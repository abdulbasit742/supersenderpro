'use strict';
// #71 Loyalty & Points — earn/spend engine + ledger writes.
const crypto = require('crypto');
const config = require('./config');
const store = require('./store');
const tierEngine = require('./tierEngine');

function id() { return 'lp_' + crypto.randomBytes(8).toString('hex'); }

// Award points for a paid order. amount = order total in currency.
function earn(db, { tenantId, contactId, amount, orderId, reason }) {
  if (!contactId) throw new Error('contactId required');
  const acct = store.getAccount(db, tenantId, contactId);
  const amt = Number(amount) || 0;
  if (amt < config.minOrderToEarn) {
    return { awarded: 0, account: acct, skipped: 'below_min_order' };
  }
  const tier = tierEngine.tierFor(acct.lifetimeEarned);
  const base = amt * config.pointsPerCurrency;
  const awarded = Math.floor(base * (tier.multiplier || 1));
  acct.balance += awarded;
  acct.lifetimeEarned += awarded;
  acct.tier = tierEngine.tierFor(acct.lifetimeEarned).id;
  acct.updatedAt = new Date().toISOString();
  db.ledger.push({ id: id(), tenantId: tenantId || 'default', contactId, type: 'earn', points: awarded, orderId: orderId || null, reason: reason || 'order.paid', at: new Date().toISOString() });
  return { awarded, account: acct };
}

// Spend/redeem points. Returns currency value applied.
function redeem(db, { tenantId, contactId, points, orderId, orderTotal }) {
  if (!contactId) throw new Error('contactId required');
  const acct = store.getAccount(db, tenantId, contactId);
  let pts = Math.max(0, Math.floor(Number(points) || 0));
  if (pts > acct.balance) pts = acct.balance;
  // Cap by max redeem ratio of the order.
  if (orderTotal) {
    const maxValue = Number(orderTotal) * config.maxRedeemRatio;
    const maxPts = Math.floor(maxValue / config.pointValue);
    if (pts > maxPts) pts = maxPts;
  }
  if (pts <= 0) return { redeemed: 0, value: 0, account: acct };
  acct.balance -= pts;
  acct.lifetimeRedeemed += pts;
  acct.updatedAt = new Date().toISOString();
  const value = +(pts * config.pointValue).toFixed(2);
  db.ledger.push({ id: id(), tenantId: tenantId || 'default', contactId, type: 'redeem', points: -pts, value, orderId: orderId || null, at: new Date().toISOString() });
  return { redeemed: pts, value, account: acct };
}

// Manual adjustment (admin grant/clawback).
function adjust(db, { tenantId, contactId, points, reason }) {
  if (!contactId) throw new Error('contactId required');
  const acct = store.getAccount(db, tenantId, contactId);
  const delta = Math.floor(Number(points) || 0);
  acct.balance += delta;
  if (delta > 0) acct.lifetimeEarned += delta;
  if (acct.balance < 0) acct.balance = 0;
  acct.tier = tierEngine.tierFor(acct.lifetimeEarned).id;
  acct.updatedAt = new Date().toISOString();
  db.ledger.push({ id: id(), tenantId: tenantId || 'default', contactId, type: 'adjust', points: delta, reason: reason || 'manual', at: new Date().toISOString() });
  return { account: acct };
}

module.exports = { earn, redeem, adjust };
