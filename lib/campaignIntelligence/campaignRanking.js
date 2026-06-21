// lib/campaignIntelligence/campaignRanking.js — best/worst campaigns by composite score preview.
 'use strict';
 const cfg = require('./config');
 const { loadCampaigns } = require('./moduleAdapters');
 const { deriveFunnel, deriveFinance, rate } = require('./campaignModel');
 const { maskCampaignId } = require('./redactor');


 function scored() {
     const camps = loadCampaigns();
     return (camps.length ? camps : [{ id: 'demo1' }, { id: 'demo2' }, { id: 'demo3' }]).map((c) => {
       const f = deriveFunnel(c); const fin = deriveFinance(c, f);
       const conv = rate(f.convertedPreview, f.sentPreview);
       const roi = fin.costPreview > 0 ? (fin.revenuePreview - fin.costPreview) / fin.costPreview : 0;
       const score = Math.round(conv * 60 + Math.max(-1, Math.min(3, roi)) * 13 + rate(f.readPreview, f.deliveredPreview) *
 20);
       return { campaignIdPreview: maskCampaignId(c.id), scorePreview: Math.max(0, Math.min(100, score)),
 conversionRatePreview: conv, roiPreview: Number(roi.toFixed(2)) };

       });
  }
  function bestCampaigns() { return cfg.base({ rankingPreview: scored().sort((a, b) => b.scorePreview -
  a.scorePreview).slice(0, 10) }); }
  function weakCampaigns() { return cfg.base({ rankingPreview: scored().sort((a, b) => a.scorePreview -
  b.scorePreview).slice(0, 10) }); }
  module.exports = { bestCampaigns, weakCampaigns };
