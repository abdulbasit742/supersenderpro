// lib/platformControl/webhookReadiness.js — read-only webhook readiness preview. No webhook firing.
'use strict';
const cfg = require('./config');

function getWebhookReadiness() {
  const dispatcherPreview = cfg.exists('lib/webhookDispatcher.js');
  const cloudVerifyConfiguredPreview = !!process.env.WHATSAPP_CLOUD_VERIFY_TOKEN;
  const n8nConfiguredPreview = !!process.env.N8N_WEBHOOK_URL;
  return cfg.safetyFlags({
    liveWebhookDispatchEnabled: false,
    dispatcherPreview,
    cloudVerifyConfiguredPreview,
    n8nConfiguredPreview,
    warnings: dispatcherPreview ? [] : ['webhook_dispatcher_not_found_preview'],
    blockers: [],
  });
}
module.exports = { getWebhookReadiness };
