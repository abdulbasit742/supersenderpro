// lib/campaignIntelligence/funnelAnalytics.js — funnel + drop-off preview for one campaign.
  'use strict';
  const cfg = require('./config');
  const { loadCampaigns } = require('./moduleAdapters');
  const { deriveFunnel, rate } = require('./campaignModel');

  function funnelFor(campaignOrId) {
      let c = campaignOrId;
      if (typeof campaignOrId === 'string') c = loadCampaigns().find((x) => String(x.id) === campaignOrId) || { id:
  campaignOrId };
    const f = deriveFunnel(c || {});
      const stages = [
        ['targeted', f.targetedPreview], ['sent', f.sentPreview], ['delivered', f.deliveredPreview], ['read', f.readPreview],
       ['replied', f.repliedPreview], ['clicked', f.clickedPreview], ['converted', f.convertedPreview], ['retained',

 f.retainedPreview],
   ];
   const dropOffsPreview = [];
   for (let i = 1; i < stages.length; i++) {
     const prev = stages[i - 1][1], cur = stages[i][1];
     const drop = prev > 0 ? Number((1 - cur / prev).toFixed(3)) : 0;
     if (drop >= 0.5) dropOffsPreview.push({ from: stages[i - 1][0], to: stages[i][0], dropRatePreview: drop });
   }
   const recommendationsPreview = dropOffsPreview.map((d) => 'High drop ' + d.from + '->' + d.to + ' (' +
 Math.round(d.dropRatePreview * 100) + '%); review ' + d.to + ' step.');
   return cfg.base({ funnelPreview: f, dropOffsPreview, conversionRatePreview: rate(f.convertedPreview, f.sentPreview),
 recommendationsPreview });
 }
 module.exports = { funnelFor };
