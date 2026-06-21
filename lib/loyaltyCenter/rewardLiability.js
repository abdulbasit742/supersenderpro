  'use strict';

  /**
      * Loyalty Center — reward liability preview.
      *
      * Outstanding points (as currency) + store credit are a liability on the books.
      * Preview only; no ledger write.
      */


  const tiers = require('./rewardTierService');
  const { POINTS_TO_CURRENCY } = require('./redemptionPreview');

  function round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }

  function preview() {
       const custs = tiers.list({ limit: 100000 });
       let points = 0, credit = 0;
       for (const c of custs) { points += Number(c.pointsBalancePreview) || 0; credit += Number(c.storeCreditPreview) || 0; }
       const pointsLiability = round2(points * POINTS_TO_CURRENCY);
       return {
         ok: true, dryRun: true, liveLedgerWrite: false,
           totalPointsOutstandingPreview: points,


         totalPointsLiabilityPreview: pointsLiability,
         totalStoreCreditLiabilityPreview: round2(credit),
         totalLiabilityPreview: round2(pointsLiability + credit),
         pointsToCurrency: POINTS_TO_CURRENCY,
         warnings: [], blockers: [],
       };
  }

  module.exports = { preview };
