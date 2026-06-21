// lib/campaignIntelligence/broadcastHealthScore.js — broadcast health 0-100 preview.
 'use strict';
 const cfg = require('./config');
 const { deliveryAnalytics } = require('./whatsappDeliveryAnalytics');
 const { readReplyAnalytics } = require('./replyAnalytics');


 function broadcastHealthScore() {
   const d = deliveryAnalytics(); const r = readReplyAnalytics();
   let score = Math.round(d.deliveryRatePreview * 50 + r.readRatePreview * 30 + r.replyRatePreview * 20);
   score = Math.max(0, Math.min(100, score));
   return cfg.base({ broadcastHealthScorePreview: score, gradePreview: score >= 75 ? 'healthy_preview' : score >= 50 ?
 'fair_preview' : 'at_risk_preview', deliveryRatePreview: d.deliveryRatePreview, readRatePreview: r.readRatePreview });
 }
 module.exports = { broadcastHealthScore };
