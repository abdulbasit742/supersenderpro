// lib/campaignIntelligence/winningVariantPreview.js — picks winner + rationale preview.
 'use strict';
 const cfg = require('./config');
 const { abTestResult } = require('./abTestResultPreview');


 function winningVariant(input) {
     const r = abTestResult(input || {});
     return cfg.base({
      winnerPreview: r.winnerPreview, confidencePreview: r.confidencePreview,
      variantAPreview: r.variantAPreview, variantBPreview: r.variantBPreview,
       rolloutRecommendationPreview: r.recommendationPreview,
     });

 }
 module.exports = { winningVariant };
