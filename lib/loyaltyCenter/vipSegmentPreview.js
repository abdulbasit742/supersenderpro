  'use strict';

  /** Loyalty Center — VIP / segment preview. */


  const tiers = require('./rewardTierService');

  function segments() {
       const custs = tiers.list({ limit: 5000 });
       const bucket = { vip_preview: [], platinum_preview: [], gold_preview: [], silver_preview: [], bronze_preview: [] };
    for (const c of custs) (bucket[c.tier] = bucket[c.tier] || []).push({ customerNameSafe: c.customerNameSafe,
  lifetimeSpendPreview: c.lifetimeSpendPreview, pointsBalancePreview: c.pointsBalancePreview });
       const counts = Object.fromEntries(Object.keys(bucket).map((k) => [k, bucket[k].length]));
       const vipCustomers = (bucket.vip_preview || []).concat(bucket.platinum_preview || []);
    return { ok: true, dryRun: true, counts, vipCustomersPreview: vipCustomers.length, segments: bucket, warnings: [],
  blockers: [] };
  }

  module.exports = { segments };
