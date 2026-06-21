// lib/campaignIntelligence/campaignRegistry.js — read-only campaign list from adapters/data.
  'use strict';
  const cfg = require('./config');
  const { loadCampaigns } = require('./moduleAdapters');
  const { redactCampaign } = require('./redactor');


  function listCampaigns() {
    const arr = loadCampaigns();
    return cfg.base({ campaignsPreview: arr.map(redactCampaign), sourceDetectedPreview: arr.length > 0, totalPreview:
  arr.length });
  }
  function getCampaign(id) {
      const arr = loadCampaigns();
      const c = arr.find((x) => String(x.id) === String(id)) || null;
      return cfg.base({ campaignPreview: c ? redactCampaign(c) : null, foundPreview: !!c });
  }
  module.exports = { listCampaigns, getCampaign };
