'use strict';
// #71 Loyalty & Points — config (env-driven, safe defaults).
// All advisory/dry-run by default. No outbound, no charges.

function num(v, d) { const n = Number(v); return Number.isFinite(n) ? n : d; }
function bool(v, d) { if (v === undefined || v === null || v === '') return d; return String(v).toLowerCase() === 'true' || v === '1'; }

const config = {
  enabled: bool(process.env.LOYALTY_ENABLED, true),
  // Earn: points per 1 unit of currency spent on a paid order.
  pointsPerCurrency: num(process.env.LOYALTY_POINTS_PER_CURRENCY, 1),
  // Minimum order value to earn any points.
  minOrderToEarn: num(process.env.LOYALTY_MIN_ORDER_TO_EARN, 0),
  // Redemption: how much currency 1 point is worth when redeemed.
  pointValue: num(process.env.LOYALTY_POINT_VALUE, 0.01),
  // Max % of an order that can be paid with points (0..1).
  maxRedeemRatio: num(process.env.LOYALTY_MAX_REDEEM_RATIO, 0.5),
  // Points expire after N days (0 = never).
  expiryDays: num(process.env.LOYALTY_EXPIRY_DAYS, 0),
  // Tiers by lifetime earned points (ascending). Multiplier boosts earn rate.
  tiers: [
    { id: 'bronze', name: 'Bronze', minLifetime: 0, multiplier: 1.0 },
    { id: 'silver', name: 'Silver', minLifetime: 1000, multiplier: 1.25 },
    { id: 'gold', name: 'Gold', minLifetime: 5000, multiplier: 1.5 },
    { id: 'platinum', name: 'Platinum', minLifetime: 20000, multiplier: 2.0 }
  ]
};

module.exports = config;
