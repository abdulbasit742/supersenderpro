'use strict';
// #80 Abandoned Cart Recovery — compute + record due recovery nudges (draft-only).
const config = require('./config');
const store = require('./store');

// Which nudge indexes are due now for an abandoned cart?
function dueNudges(cart, atMs) {
  if (cart.status !== 'abandoned') return [];
  const base = Date.parse(cart.abandonedAt || cart.lastActivityAt || cart.createdAt);
  const sent = new Set((cart.nudges || []).map(n => n.index));
  const due = [];
  const offsets = config.nudgeOffsetsHours.slice(0, config.maxNudges);
  offsets.forEach((hrs, idx) => {
    if (sent.has(idx)) return;
    if (atMs >= base + hrs * 3600 * 1000) due.push({ index: idx, offsetHours: hrs, isFinal: idx === offsets.length - 1 });
  });
  return due;
}

// Build a draft recovery message (advisory — never sent here).
function buildDraft(cart, nudge) {
  const lines = [];
  lines.push(`Hi! You left ${cart.items ? cart.items.length + ' item(s)' : 'items'} in your cart.`);
  if (cart.value) lines.push(`Cart total: ${cart.value}.`);
  let coupon = null;
  if (nudge.isFinal && config.finalNudgeCoupon) {
    coupon = mintWinback(cart);
    if (coupon && coupon.code) lines.push(`Here's ${config.couponPercent}% off to finish up: ${coupon.code}`);
    else lines.push(`Use code SAVE${config.couponPercent} to get ${config.couponPercent}% off.`);
  }
  lines.push('Complete your order anytime.');
  return { text: lines.join(' '), coupon };
}

function mintWinback(cart) {
  try {
    const coupons = require('../coupons');
    if (coupons && typeof coupons.createCoupon === 'function') {
      return coupons.createCoupon({ tenantId: cart.tenantId, type: 'percent', amount: config.couponPercent, note: `cart-recovery:${cart.id}`, singleUse: true });
    }
  } catch (_) { /* coupons absent */ }
  return { advisory: true, percent: config.couponPercent };
}

// Process due nudges for all abandoned carts; record drafts (does not send).
function processDue(db, atMs) {
  const at = atMs || Date.now();
  const drafts = [];
  for (const cart of Object.values(db.carts)) {
    if (cart.status !== 'abandoned') continue;
    for (const nudge of dueNudges(cart, at)) {
      const draft = buildDraft(cart, nudge);
      cart.nudges = cart.nudges || [];
      cart.nudges.push({ index: nudge.index, at: new Date(at).toISOString(), isFinal: nudge.isFinal, status: 'drafted' });
      drafts.push({ tenantId: cart.tenantId, cartId: cart.id, contactId: cart.contactId, draft });
    }
  }
  return drafts;
}
module.exports = { dueNudges, buildDraft, processDue, mintWinback };
