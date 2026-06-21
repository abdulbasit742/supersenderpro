// lib/campaignIntelligence/anomalyDetectorPreview.js — flags unusual campaign metrics preview.
 'use strict';
 const cfg = require('./config');
 const { loadCampaigns } = require('./moduleAdapters');
 const { deriveFunnel, rate } = require('./campaignModel');
 const { maskCampaignId } = require('./redactor');


 function anomalyDetector() {
   const camps = loadCampaigns();
     const anomaliesPreview = [];
     (camps.length ? camps : [{}]).forEach((c) => {
       const f = deliveryFunnel(c);
       const deliveryRate = rate(f.deliveredPreview, f.sentPreview);
       const replyRate = rate(f.repliedPreview, f.readPreview);
       if (deliveryRate < 0.6) anomaliesPreview.push({ campaignIdPreview: maskCampaignId(c.id), signal:
 'low_delivery_rate_preview', valuePreview: deliveryRate });
     if (replyRate > 0.6) anomaliesPreview.push({ campaignIdPreview: maskCampaignId(c.id), signal:
 'unusually_high_reply_rate_preview', valuePreview: replyRate });
   });
     return cfg.base({ anomaliesPreview });
 }
 function deliveryFunnel(c) { return deriveFunnel(c); }
 module.exports = { anomalyDetector };
