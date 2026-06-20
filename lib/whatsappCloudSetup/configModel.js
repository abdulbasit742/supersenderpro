// lib/whatsappCloudSetup/configModel.js — WhatsApp Cloud config model. Stores masked values only, never raw tokens.
'use strict';

const { maskId } = require('./redactor');
const { envPresence } = require('./safety');

function newConfigId() {
  // base36 to avoid long digit runs that could look like a phone number
  return 'wcs_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// Build / normalise a config object. Accepts raw ids (which are masked immediately) or pre-masked values.
function buildConfig(input = {}) {
  const now = new Date().toISOString();
  const env = envPresence();
  return {
    id: input.id || newConfigId(),
    businessName: String(input.businessName || '').slice(0, 120),
    wabaIdMasked: input.wabaIdMasked || maskId(input.wabaId),
    phoneNumberIdMasked: input.phoneNumberIdMasked || maskId(input.phoneNumberId),
    appIdMasked: input.appIdMasked || maskId(input.appId),
    webhookUrl: input.webhookUrl || (process.env.WHATSAPP_CLOUD_WEBHOOK_PATH || '/api/whatsapp/webhook'),
    verifyTokenConfigured: input.verifyTokenConfigured !== undefined ? !!input.verifyTokenConfigured : env.verifyTokenConfigured,
    accessTokenConfigured: input.accessTokenConfigured !== undefined ? !!input.accessTokenConfigured : env.accessTokenConfigured,
    businessVerified: !!input.businessVerified,
    paymentMethodConfigured: !!input.paymentMethodConfigured,
    templatesReady: !!input.templatesReady,
    webhookVerified: !!input.webhookVerified,
    dryRun: input.dryRun !== undefined ? !!input.dryRun : true,
    createdAt: input.createdAt || now,
    updatedAt: now,
  };
}

function defaultConfig() {
  return buildConfig({});
}

module.exports = { buildConfig, defaultConfig, newConfigId };
