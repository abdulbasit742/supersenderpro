  'use strict';


  /** Loyalty Center — reward redemption preview (no coupon activation). */


  const tiers = require('./rewardTierService');
  const pointsLedger = require('./pointsLedger');


  // points -> currency conversion preview (e.g. 100 pts = 100 PKR).
  const POINTS_TO_CURRENCY = Number(process.env.LOYALTY_POINTS_TO_CURRENCY || 1);


  function preview(input) {
      const i = input || {};
      const cust = tiers.getRaw(i.customerId);
      const balance = cust ? (cust.pointsBalancePreview || pointsLedger.balanceFor(cust.customerId)) : 0;
      const pointsRequired = Math.max(0, Number(i.pointsRequired) || 0);
      const rewardValue = Math.round(pointsRequired * POINTS_TO_CURRENCY * 100) / 100;
      const allowed = pointsRequired > 0 && balance >= pointsRequired;
      const warnings = [];
      if (!allowed && pointsRequired > 0) warnings.push('insufficient points balance for this redemption');
      return {
        ok: true, dryRun: true, liveCoupon: false,
        customerId: i.customerId || null,
        rewardValuePreview: rewardValue,
        pointsRequiredPreview: pointsRequired,
        balancePreview: balance,
        allowedPreview: allowed,
        warnings, blockers: ['live_coupon_disabled'],
      };
  }


  module.exports = { preview, POINTS_TO_CURRENCY };
