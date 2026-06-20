// lib/whatsappCloudSetup/safety.js — Central safety flags for the WhatsApp Cloud Setup coordination layer.
// Dry-run by default. Never enables live sends or live Meta API calls on its own.
'use strict';

function bool(v, def = false) {
  if (v === undefined || v === null || v === '') return def;
  return String(v).toLowerCase() === 'true';
}

const flags = {
  enabled: bool(process.env.WHATSAPP_CLOUD_SETUP_ENABLED, true),
  dryRun: bool(process.env.WHATSAPP_CLOUD_SETUP_DRY_RUN, true),
  liveSend: bool(process.env.WHATSAPP_CLOUD_LIVE_SEND, false),
  templateSyncLive: bool(process.env.WHATSAPP_CLOUD_TEMPLATE_SYNC_LIVE, false),
  redactPII: bool(process.env.WHATSAPP_CLOUD_REDACT_PII, true),
  redactSecrets: bool(process.env.WHATSAPP_CLOUD_REDACT_SECRETS, true),
};

// Environment-derived configuration presence (never the values themselves).
function envPresence() {
  return {
    accessTokenConfigured: !!process.env.WHATSAPP_CLOUD_ACCESS_TOKEN,
    verifyTokenConfigured: !!process.env.WHATSAPP_CLOUD_VERIFY_TOKEN,
    phoneNumberIdConfigured: !!process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID,
    wabaIdConfigured: !!process.env.WHATSAPP_CLOUD_WABA_ID,
    appIdConfigured: !!process.env.WHATSAPP_CLOUD_APP_ID,
  };
}

function safetyPanel() {
  return {
    dryRunEnabled: flags.dryRun,
    liveSendDisabled: !flags.liveSend,
    templateSyncLiveDisabled: !flags.templateSyncLive,
    tokenHidden: flags.redactSecrets,
    piiRedacted: flags.redactPII,
    noRealApiByDefault: !flags.templateSyncLive && !flags.liveSend,
  };
}

module.exports = { bool, flags, envPresence, safetyPanel };
