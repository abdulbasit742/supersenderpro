// lib/campaignIntelligence/performanceSummary.js — per-campaign performance preview.
 'use strict';
 const cfg = require('./config');
 const { loadCampaigns } = require('./moduleAdapters');
 const { deriveFunnel, deriveFinance } = require('./campaignModel');
 const { maskCampaignId } = require('./redactor');
 const { seeded } = require('./config');


 function performanceFor(id) {
   const c = loadCampaigns().find((x) => String(x.id) === String(id)) || { id };
   const f = deriveFunnel(c); const fin = deriveFinance(c, f);
   const rnd = seeded((c.id || 'c') + ':perf');
   const failed = Math.max(0, f.sentPreview - f.deliveredPreview);
   const optOut = Math.floor(f.deliveredPreview * (0.005 + rnd() * 0.03));
   return cfg.base({
     campaignIdPreview: maskCampaignId(c.id), campaignNamePreview: 'Campaign ' + String(c.id || '****').slice(-4),
     sentPreview: f.sentPreview, deliveredPreview: f.deliveredPreview, readPreview: f.readPreview, repliedPreview:
 f.repliedPreview,
     failedPreview: failed, optOutPreview: optOut, conversionPreview: f.convertedPreview, revenuePreview:
 fin.revenuePreview,
   });
 }
 module.exports = { performanceFor };
