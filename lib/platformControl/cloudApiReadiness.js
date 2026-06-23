// lib/platformControl/cloudApiReadiness.js — read-only WhatsApp Cloud (Meta) readiness. No Meta API calls.
'use strict';
const cfg = require('./config');

function getCloudApiReadiness() {
  const filesReadyPreview = cfg.anyExists(cfg.HINTS.whatsappCloud);
  const keys = ['WHATSAPP_CLOUD_PHONE_NUMBER_ID', 'WHATSAPP_CLOUD_BUSINESS_ACCOUNT_ID',
    'WHATSAPP_CLOUD_ACCESS_TOKEN', 'WHATSAPP_CLOUD_VERIFY_TOKEN', 'WHATSAPP_CLOUD_WEBHOOK_SECRET'];
  const configuredKeysMaskedPreview = keys.filter((k) => !!process.env[k]).map((k) => k + '=configured');
  const missingKeysPreview = keys.filter((k) => !process.env[k]);
  return cfg.safetyFlags({
    liveMetaApiEnabled: false,
    liveSendEnabled: false,
    filesReadyPreview,
    configuredKeysMaskedPreview,
    missingKeysPreview,
    warnings: missingKeysPreview.length ? ['cloud_api_keys_not_fully_configured_preview'] : [],
    blockers: [],
  });
}
module.exports = { getCloudApiReadiness };
