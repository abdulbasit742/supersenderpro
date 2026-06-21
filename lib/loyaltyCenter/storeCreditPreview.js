  'use strict';


  /** Loyalty Center — store credit preview (no wallet mutation). */


  const tiers = require('./rewardTierService');

  function preview(input) {
       const i = input || {};
       const cust = tiers.getRaw(i.customerId);
       const current = cust ? (cust.storeCreditPreview || 0) : 0;
       const amount = Math.max(0, Number(i.creditAmount) || 0);
       const balanceAfter = Math.round((current + amount) * 100) / 100;
       return { ok: true, dryRun: true, liveWalletWrite: false, customerId: i.customerId || null, creditAmountPreview: amount,
  balanceAfterPreview: balanceAfter, warnings: [], blockers: ['live_wallet_write_disabled'] };
  }


  module.exports = { preview };
