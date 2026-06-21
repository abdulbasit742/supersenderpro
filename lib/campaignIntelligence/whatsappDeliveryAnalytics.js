// lib/campaignIntelligence/whatsappDeliveryAnalytics.js — aggregate delivery preview. No Meta call.
 'use strict';
 const cfg = require('./config');
 const { loadCampaigns } = require('./moduleAdapters');
 const { deriveFunnel, rate } = require('./campaignModel');


 function deliveryAnalytics() {
   const camps = loadCampaigns();
   let sent = 0, delivered = 0, failed = 0;

    (camps.length ? camps : [{}]).forEach((c) => { const f = deriveFunnel(c); sent += f.sentPreview; delivered +=
  f.deliveredPreview; failed += Math.max(0, f.sentPreview - f.deliveredPreview); });
    return cfg.base({ metaApiCall: false, sentPreview: sent, deliveredPreview: delivered, failedPreview: failed,
  deliveryRatePreview: rate(delivered, sent), failureRatePreview: rate(failed, sent) });
  }
  module.exports = { deliveryAnalytics };
