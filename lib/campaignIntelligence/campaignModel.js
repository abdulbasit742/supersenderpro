// lib/campaignIntelligence/campaignModel.js — normalization + deterministic synthetic metrics for previews.
 'use strict';
 const { seeded } = require('./config');


 function isObj(x) { return x && typeof x === 'object' && !Array.isArray(x); }

 // Build a stable funnel for a campaign from whatever fields exist, else seeded synthetic preview.
 function deriveFunnel(c) {
      const camp = isObj(c) ? c : {};
      const rnd = seeded(camp.id || camp.name || 'campaign');
      const targeted = num(camp.targeted, () => 500 + Math.floor(rnd() * 4500));
      const sent = num(camp.sent, () => Math.floor(targeted * (0.9 + rnd() * 0.1)));
      const delivered = num(camp.delivered, () => Math.floor(sent * (0.85 + rnd() * 0.13)));
      const read = num(camp.read, () => Math.floor(delivered * (0.55 + rnd() * 0.35)));
      const replied = num(camp.replied, () => Math.floor(read * (0.08 + rnd() * 0.22)));
      const clicked = num(camp.clicked, () => Math.floor(read * (0.05 + rnd() * 0.2)));
      const converted = num(camp.converted, () => Math.floor(replied * (0.1 + rnd() * 0.3)));
      const retained = num(camp.retained, () => Math.floor(converted * (0.3 + rnd() * 0.5)));
   return { targetedPreview: targeted, sentPreview: sent, deliveredPreview: delivered, readPreview: read, repliedPreview:
 replied, clickedPreview: clicked, convertedPreview: converted, retainedPreview: retained };
 }

  function deriveFinance(c, funnel) {
      const camp = isObj(c) ? c : {};
      const rnd = seeded((camp.id || 'c') + ':fin');
      const avgOrderValue = num(camp.avgOrderValue, () => 2000 + Math.floor(rnd() * 8000));
      const converted = funnel.convertedPreview;
      const revenue = num(camp.revenue, () => converted * avgOrderValue);
      const cost = num(camp.cost, () => Math.max(500, Math.floor(funnel.sentPreview * (0.5 + rnd() * 2))));
      return { avgOrderValuePreview: avgOrderValue, revenuePreview: revenue, costPreview: cost };
  }


  function num(v, fallback) { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : fallback(); }

  function rate(numer, denom) { return denom > 0 ? Number((numer / denom).toFixed(4)) : 0; }


  module.exports = { isObj, deriveFunnel, deriveFinance, rate };
