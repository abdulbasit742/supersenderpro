// lib/campaignIntelligence/segmentPerformancePreview.js — per-segment aggregate preview.
  'use strict';
  const cfg = require('./config');
  const { seeded } = require('./config');


  const SEGMENTS = ['new_preview', 'active_preview', 'loyal_preview', 'lapsed_preview', 'dealer_preview'];


  function segmentPerformance() {
      const segmentsPreview = SEGMENTS.map((seg) => {
        const rnd = seeded(seg);
        const sent = 200 + Math.floor(rnd() * 2000);

     const replyRate = Number((0.05 + rnd() * 0.3).toFixed(3));
     const convRate = Number((0.02 + rnd() * 0.15).toFixed(3));
     return { segmentPreview: seg, sentPreview: sent, replyRatePreview: replyRate, conversionRatePreview: convRate,
 optOutRatePreview: Number((rnd() * 0.04).toFixed(3)) };
   });
   const best = segmentsPreview.slice().sort((a, b) => b.conversionRatePreview - a.conversionRatePreview)[0];
   return cfg.base({ segmentsPreview, bestSegmentPreview: best ? best.segmentPreview : null });
 }
 module.exports = { segmentPerformance, SEGMENTS };
