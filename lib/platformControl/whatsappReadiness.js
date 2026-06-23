// lib/platformControl/whatsappReadiness.js — read-only WhatsApp readiness (no live send, env presence only).
'use strict';
const cfg = require('./config');

function getWhatsAppReadiness() {
  const H = cfg.HINTS;
  const baileysReadyPreview = cfg.anyExists(H.whatsappLocal);
  const cloudApiReadyPreview = cfg.anyExists(H.whatsappCloud);
  const webhookReadyPreview = cfg.anyExists(H.webhooks);
  const templatesReadyPreview = cfg.anyExists(H.templates);
  const envPresentPreview = ['WHATSAPP_CLOUD_PHONE_NUMBER_ID', 'WHATSAPP_CLOUD_ACCESS_TOKEN', 'WA_PHONE_NUMBER']
    .filter((k) => !!process.env[k]).map((k) => k + '=configured');
  return cfg.safetyFlags({
    liveSendEnabled: false,
    baileysReadyPreview, cloudApiReadyPreview, webhookReadyPreview, templatesReadyPreview,
    envPresentPreview,
    warnings: (!baileysReadyPreview && !cloudApiReadyPreview) ? ['no_whatsapp_transport_detected_preview'] : [],
    blockers: [],
  });
}
module.exports = { getWhatsAppReadiness };
