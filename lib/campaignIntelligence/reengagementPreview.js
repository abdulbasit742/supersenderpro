// lib/campaignIntelligence/reengagementPreview.js — repeat purchase / lost-customer recovery preview.
  'use strict';
  const cfg = require('./config');
  const { seeded } = require('./config');


  function reengagement() {
      const rnd = seeded('reengage');
      const lapsedPreview = 300 + Math.floor(rnd() * 1200);
      const recoverableEstimatePreview = Math.floor(lapsedPreview * (0.1 + rnd() * 0.2));
      return cfg.base({

       lapsedCustomersPreview: lapsedPreview, recoverableEstimatePreview,
       repeatPurchaseRatePreview: Number((0.15 + rnd() * 0.25).toFixed(3)),
       recommendationsPreview: ['Target lapsed customers with a careful win-back offer, respect opt-out.'],
     });
 }
 module.exports = { reengagement };
