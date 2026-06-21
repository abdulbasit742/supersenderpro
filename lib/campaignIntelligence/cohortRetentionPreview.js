// lib/campaignIntelligence/cohortRetentionPreview.js — monthly cohort retention preview.
  'use strict';
  const cfg = require('./config');
  const { seeded } = require('./config');


  function cohortRetention() {
    const cohortsPreview = ['M-3_preview', 'M-2_preview', 'M-1_preview', 'M-0_preview'].map((c) => {
       const rnd = seeded('cohort:' + c);
       const size = 200 + Math.floor(rnd() * 800);
       const retention = [1, 2, 3].map((m) => Number((Math.max(0, 0.6 - m * 0.15 + rnd() * 0.1)).toFixed(3)));
       return { cohortPreview: c, sizePreview: size, retentionByMonthPreview: retention };
      });
      return cfg.base({ cohortsPreview });
  }
  module.exports = { cohortRetention };
