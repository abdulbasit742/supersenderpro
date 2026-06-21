// lib/campaignIntelligence/optOutRiskPreview.js — opt-out / unsubscribe risk preview.
  'use strict';
  const cfg = require('./config');
  const { segmentPerformance } = require('./segmentPerformancePreview');


  function optOutRisk() {
    const segs = segmentPerformance().segmentsPreview;
    const highRiskSegmentsPreview = segs.filter((s) => s.optOutRatePreview >= 0.025).map((s) => ({ segment:
  s.segmentPreview, optOutRatePreview: s.optOutRatePreview }));
      const avg = segs.reduce((s, x) => s + x.optOutRatePreview, 0) / Math.max(1, segs.length);
      const level = avg >= 0.025 ? 'high_preview' : avg >= 0.012 ? 'medium_preview' : 'low_preview';
      return cfg.base({ optOutRiskPreview: level, avgOptOutRatePreview: Number(avg.toFixed(3)), highRiskSegmentsPreview });
  }
  module.exports = { optOutRisk };
