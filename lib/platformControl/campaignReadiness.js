// lib/platformControl/campaignReadiness.js — campaign modules presence, live send OFF.
  'use strict';
  const cfg = require('./config');


  function campaignReadiness() {
      return cfg.base({
        liveCampaignSendEnabled: false,
        campaignModulesDetectedPreview: cfg.hasFile([/campaign|broadcast|blast/i]),
        schedulerDetectedPreview: cfg.hasFile([/scheduler|cron/i]),
        audienceModuleDetectedPreview: cfg.hasFile([/audience|segment|contact/i]),
      });
  }


  module.exports = { campaignReadiness };
