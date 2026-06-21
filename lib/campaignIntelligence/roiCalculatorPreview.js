// lib/campaignIntelligence/roiCalculatorPreview.js — ROI preview from cost + attributed revenue.
  'use strict';
  const cfg = require('./config');
  const { loadCampaigns } = require('./moduleAdapters');
  const { deriveFunnel, deriveFinance } = require('./campaignModel');


  function roiFor(id) {
      const c = loadCampaigns().find((x) => String(x.id) === String(id)) || { id };
      const f = deriveFunnel(c); const fin = deriveFinance(c, f);
      const cost = fin.costPreview; const revenue = fin.revenuePreview;
      const profit = revenue - cost;
      const roi = cost > 0 ? Number(((profit / cost) * 100).toFixed(1)) : 0;
      const recommendationsPreview = [];
      if (roi < 0) recommendationsPreview.push('Negative ROI preview; reduce cost or improve targeting.');
      else if (roi < 50) recommendationsPreview.push('Low ROI preview; test better copy/CTA and send-time.');
    return cfg.base({ campaignCostPreview: cost, revenueAttributedPreview: revenue, roiPreview: roi, profitPreview: profit,
  breakEvenPreview: profit >= 0, recommendationsPreview });
  }
  module.exports = { roiFor };
