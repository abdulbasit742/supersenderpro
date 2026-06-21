// lib/campaignIntelligence/revenueAttributionPreview.js — attribution preview. No payment/invoice mutation.
  'use strict';
  const cfg = require('./config');
  const { loadCampaigns } = require('./moduleAdapters');
  const { deriveFunnel, deriveFinance } = require('./campaignModel');

  const { maskCampaignId } = require('./redactor');


  function attributionFor(id, model) {
      const c = loadCampaigns().find((x) => String(x.id) === String(id)) || { id };
      const f = deriveFunnel(c); const fin = deriveFinance(c, f);
    const attributionModel = ['last_touch_preview', 'first_touch_preview', 'linear_preview'].includes(model) ? model :
  'last_touch_preview';
      const factor = attributionModel === 'linear_preview' ? 0.7 : attributionModel === 'first_touch_preview' ? 0.85 : 1;
      return cfg.base({
        livePaymentAction: false, liveInvoiceMutation: false,
        campaignIdPreview: maskCampaignId(c.id), attributedOrdersPreview: f.convertedPreview,
        revenueAttributedPreview: Math.round(fin.revenuePreview * factor), attributionModelPreview: attributionModel,
        confidencePreview: Number((0.6 + factor * 0.3).toFixed(2)),
      });
  }
  module.exports = { attributionFor };
