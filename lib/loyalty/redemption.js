'use strict';
// #71 Loyalty & Points — redemption helpers; optionally mints a coupon (#59) for the value.
const config = require('./config');

// Quote how much a given points balance/redeem request is worth, capped by order.
function quote({ points, orderTotal }) {
  let pts = Math.max(0, Math.floor(Number(points) || 0));
  let value = +(pts * config.pointValue).toFixed(2);
  let capped = false;
  if (orderTotal) {
    const maxValue = +(Number(orderTotal) * config.maxRedeemRatio).toFixed(2);
    if (value > maxValue) { value = maxValue; pts = Math.floor(maxValue / config.pointValue); capped = true; }
  }
  return { points: pts, value, capped, pointValue: config.pointValue };
}

// Optionally turn redeemed value into a coupon via the coupons dept (#59) if present.
function toCoupon({ tenantId, contactId, value }) {
  try {
    const coupons = require('../coupons');
    if (coupons && typeof coupons.createCoupon === 'function') {
      return coupons.createCoupon({ tenantId, type: 'fixed', amount: value, note: `loyalty-redemption:${contactId}`, singleUse: true });
    }
  } catch (_) { /* coupons dept absent — advisory only */ }
  return { advisory: true, value, note: 'coupons dept not wired; value returned as advisory discount' };
}

module.exports = { quote, toCoupon };
