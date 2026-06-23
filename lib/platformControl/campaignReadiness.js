// lib/platformControl/campaignReadiness.js — read-only campaign readiness preview. No campaign sends.
'use strict';
const cfg = require('./config');

function getCampaignReadiness() {
  const enginePreview = cfg.anyExists(cfg.HINTS.campaigns);
  const schedulerPreview = cfg.exists('lib/channelAutomationCenter.js') || cfg.exists('routes/channelAutomation.js');
  return cfg.safetyFlags({
    liveCampaignSendEnabled: false,
    campaignEnginePreview: enginePreview,
    schedulerPreview,
    queueBackedPreview: cfg.exists('lib/queueManager.js'),
    warnings: enginePreview ? [] : ['no_campaign_engine_detected_preview'],
    blockers: [],
  });
}
module.exports = { getCampaignReadiness };
