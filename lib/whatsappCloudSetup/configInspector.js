 'use strict';

 /**
     * WhatsApp Cloud API — Config Inspector (read-only, secret-safe).
     *
     * Inspects environment configuration for the EXISTING WhatsApp Cloud API lane.
     * - Never prints or returns secret values (token / verify token / webhook secret).
     * - Never calls Meta APIs.
     * - Returns presence/status + masked preview + next steps only.
     */

 const ENV = process.env;

 function isSet(v) {
   return typeof v === 'string' && v.trim().length > 0;
 }


 function boolEnv(name, fallback) {
   const v = ENV[name];
      if (v === undefined || v === null || String(v).trim() === '') return fallback;
      return String(v).trim().toLowerCase() === 'true';
 }


 // Report a secret as a status only: 'set' | 'missing'. Never expose value or length-derived hints beyond mask.
 function secretStatus(v) {
      return isSet(v) ? 'set' : 'missing';
 }

 // Masked preview for a secret: shows it exists without leaking content.
 function maskSecret(v) {
   if (!isSet(v)) return 'missing';
      return 'set (masked ****)';
 }

 // Non-secret IDs can show a light mask so the operator can sanity-check without full exposure.
 function maskId(v) {
   if (!isSet(v)) return 'missing';
      const s = String(v).trim();
      if (s.length <= 4) return '*'.repeat(s.length);
      return s.slice(0, 2) + '***' + s.slice(-2);
 }

 function inspectConfig() {
      const enabled = boolEnv('WHATSAPP_CLOUD_API_ENABLED', false);
      const dryRun = boolEnv('WHATSAPP_CLOUD_DRY_RUN', true);
      const liveTest = boolEnv('WHATSAPP_CLOUD_LIVE_TEST', false);
      const apiVersion = isSet(ENV.WHATSAPP_CLOUD_API_VERSION) ? ENV.WHATSAPP_CLOUD_API_VERSION.trim() : null;

const fields = {
  WHATSAPP_CLOUD_API_ENABLED: { present: ENV.WHATSAPP_CLOUD_API_ENABLED !== undefined, secret: false },
    WHATSAPP_CLOUD_PHONE_NUMBER_ID: { present: isSet(ENV.WHATSAPP_CLOUD_PHONE_NUMBER_ID), secret: false },
    WHATSAPP_CLOUD_BUSINESS_ACCOUNT_ID: { present: isSet(ENV.WHATSAPP_CLOUD_BUSINESS_ACCOUNT_ID), secret: false },
    WHATSAPP_CLOUD_ACCESS_TOKEN: { present: isSet(ENV.WHATSAPP_CLOUD_ACCESS_TOKEN), secret: true },
    WHATSAPP_CLOUD_VERIFY_TOKEN: { present: isSet(ENV.WHATSAPP_CLOUD_VERIFY_TOKEN), secret: true },
    WHATSAPP_CLOUD_WEBHOOK_SECRET: { present: isSet(ENV.WHATSAPP_CLOUD_WEBHOOK_SECRET), secret: true },
    WHATSAPP_CLOUD_API_VERSION: { present: isSet(ENV.WHATSAPP_CLOUD_API_VERSION), secret: false },
    WHATSAPP_CLOUD_DRY_RUN: { present: ENV.WHATSAPP_CLOUD_DRY_RUN !== undefined, secret: false },
};

// Required for a production-ready Cloud API lane.
const required = [
  'WHATSAPP_CLOUD_PHONE_NUMBER_ID',
    'WHATSAPP_CLOUD_BUSINESS_ACCOUNT_ID',
    'WHATSAPP_CLOUD_ACCESS_TOKEN',
    'WHATSAPP_CLOUD_VERIFY_TOKEN',
    'WHATSAPP_CLOUD_WEBHOOK_SECRET',
];

const missing = required.filter(function (k) { return !fields[k].present; });


const warnings = [];
if (!fields.WHATSAPP_CLOUD_API_VERSION.present) {
    warnings.push('WHATSAPP_CLOUD_API_VERSION not set; defaulting to v20.0 is recommended.');
}
if (enabled && dryRun === false && liveTest === false) {
  warnings.push('Cloud API enabled with DRY_RUN=false but LIVE_TEST=false; test actions remain dry-run only.');
}
if (liveTest === true) {
  warnings.push('WHATSAPP_CLOUD_LIVE_TEST=true: live test functions may run. Ensure existing implementation supports safe status checks.');
}
if (enabled && missing.length > 0) {
    warnings.push('Cloud API enabled but required config is incomplete.');
}
warnings.push('Baileys / local WhatsApp system is untouched by this wizard.');

const safeMaskedPreview = {
  enabled: enabled,
    dryRun: dryRun,
    liveTest: liveTest,
    apiVersion: apiVersion || 'unset (recommend v20.0)',
    phoneNumberId: maskId(ENV.WHATSAPP_CLOUD_PHONE_NUMBER_ID),
    businessAccountId: maskId(ENV.WHATSAPP_CLOUD_BUSINESS_ACCOUNT_ID),
    accessToken: maskSecret(ENV.WHATSAPP_CLOUD_ACCESS_TOKEN),
    verifyToken: maskSecret(ENV.WHATSAPP_CLOUD_VERIFY_TOKEN),
    webhookSecret: maskSecret(ENV.WHATSAPP_CLOUD_WEBHOOK_SECRET),
};


const nextSteps = [];
if (missing.indexOf('WHATSAPP_CLOUD_PHONE_NUMBER_ID') !== -1) nextSteps.push('Set WHATSAPP_CLOUD_PHONE_NUMBER_ID from Meta > WhatsApp > API Setup.');
if (missing.indexOf('WHATSAPP_CLOUD_BUSINESS_ACCOUNT_ID') !== -1) nextSteps.push('Set WHATSAPP_CLOUD_BUSINESS_ACCOUNT_ID (WABA ID) from Meta Business settings.');
if (missing.indexOf('WHATSAPP_CLOUD_ACCESS_TOKEN') !== -1) nextSteps.push('Provision a permanent system-user access token and set WHATSAPP_CLOUD_ACCESS_TOKEN (never commit it).');
if (missing.indexOf('WHATSAPP_CLOUD_VERIFY_TOKEN') !== -1) nextSteps.push('Choose a webhook verify token string and set WHATSAPP_CLOUD_VERIFY_TOKEN.');
if (missing.indexOf('WHATSAPP_CLOUD_WEBHOOK_SECRET') !== -1) nextSteps.push('Set WHATSAPP_CLOUD_WEBHOOK_SECRET (Meta app secret) to enable signature verification.');
   if (!apiVersion) nextSteps.push('Set WHATSAPP_CLOUD_API_VERSION (recommended v20.0).');
   if (nextSteps.length === 0) nextSteps.push('Core config present. Review templates and webhook diagnostics, then plan a guarded live test.');

   return {
     configured: missing.length === 0,
     enabled: enabled,
     missing: missing,
     warnings: warnings,
     safeMaskedPreview: safeMaskedPreview,
     nextSteps: nextSteps,
     // status map kept secret-safe for UI rendering
     fieldStatus: {
       WHATSAPP_CLOUD_API_ENABLED: enabled ? 'enabled' : 'disabled',
        WHATSAPP_CLOUD_PHONE_NUMBER_ID: fields.WHATSAPP_CLOUD_PHONE_NUMBER_ID.present ? 'set' : 'missing',
        WHATSAPP_CLOUD_BUSINESS_ACCOUNT_ID: fields.WHATSAPP_CLOUD_BUSINESS_ACCOUNT_ID.present ? 'set' : 'missing',
        WHATSAPP_CLOUD_ACCESS_TOKEN: secretStatus(ENV.WHATSAPP_CLOUD_ACCESS_TOKEN),
        WHATSAPP_CLOUD_VERIFY_TOKEN: secretStatus(ENV.WHATSAPP_CLOUD_VERIFY_TOKEN),
        WHATSAPP_CLOUD_WEBHOOK_SECRET: secretStatus(ENV.WHATSAPP_CLOUD_WEBHOOK_SECRET),
        WHATSAPP_CLOUD_API_VERSION: fields.WHATSAPP_CLOUD_API_VERSION.present ? 'set' : 'missing',
        WHATSAPP_CLOUD_DRY_RUN: dryRun ? 'true' : 'false',
     },
   };
}


module.exports = {
   isSet,
   boolEnv,
   maskId,
   maskSecret,
   secretStatus,
   inspectConfig,
};
