// lib/campaignIntelligence/audienceQualityScore.js — audience quality 0-100 preview.
 'use strict';
 const cfg = require('./config');
 const { segmentPerformance } = require('./segmentPerformancePreview');


 function audienceQualityScore() {
   const segs = segmentPerformance().segmentsPreview;
   const avgReply = segs.reduce((s, x) => s + x.replyRatePreview, 0) / Math.max(1, segs.length);
   const avgOptOut = segs.reduce((s, x) => s + x.optOutRatePreview, 0) / Math.max(1, segs.length);
   let score = Math.round(avgReply * 200 - avgOptOut * 300 + 40);
   score = Math.max(0, Math.min(100, score));
   return cfg.base({ audienceQualityScorePreview: score, gradePreview: score >= 70 ? 'A' : score >= 50 ? 'B' : 'C',
 avgReplyRatePreview: Number(avgReply.toFixed(3)), avgOptOutRatePreview: Number(avgOptOut.toFixed(3)) });
 }
 module.exports = { audienceQualityScore };
