// lib/campaignIntelligence/lifecycleAnalyticsPreview.js — customer lifecycle stage performance preview.
  'use strict';
  const cfg = require('./config');
  const { seeded } = require('./config');


  const STAGES = ['new_preview', 'engaged_preview', 'customer_preview', 'repeat_preview', 'lapsed_preview'];


  function lifecycleAnalytics() {
    const stagesPreview = STAGES.map((stage) => {
       const rnd = seeded('life:' + stage);
       return { stagePreview: stage, countPreview: 100 + Math.floor(rnd() * 1500), conversionRatePreview: Number((0.02 +
  rnd() * 0.2).toFixed(3)) };
    });
      return cfg.base({ stagesPreview });
  }
  module.exports = { lifecycleAnalytics, STAGES };
