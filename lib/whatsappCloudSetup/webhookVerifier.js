// lib/whatsappCloudSetup/webhookVerifier.js — Webhook verification HELPER (guide + dry-run preview).
// Does NOT touch the live /api/whatsapp-cloud/webhook route. Never exposes the verify token value.
'use strict';

const { flags } = require('./safety');

const VERIFY_TOKEN_ENV = 'WHATSAPP_CLOUD_VERIFY_TOKEN';

function expectedWebhookUrl() {
  const base = process.env.WHATSAPP_CLOUD_PUBLIC_BASE_URL
    || process.env.SOCIAL_PUBLIC_BASE_URL
    || 'https://your-domain.example';
  const path = process.env.WHATSAPP_CLOUD_WEBHOOK_PATH || '/api/whatsapp/webhook';
  return `${base.replace(/\/$/, '')}${path}`;
}

function webhookInfo() {
  return {
    ok: true,
    expectedWebhookUrl: expectedWebhookUrl(),
    verifyTokenEnvVar: VERIFY_TOKEN_ENV,
    verifyTokenConfigured: !!process.env[VERIFY_TOKEN_ENV],
    note: 'The verify token value is read from .env and never displayed here.',
    flow: [
      'In Meta App Dashboard → WhatsApp → Configuration, set the Callback URL to the expected webhook URL.',
      `Set the Verify Token to the SAME value you placed in ${VERIFY_TOKEN_ENV} in your .env.`,
      'Meta sends GET ?hub.mode=subscribe&hub.verify_token=...&hub.challenge=... to your callback URL.',
      'Your server must echo back hub.challenge ONLY when hub.verify_token matches the env value.',
      'Subscribe the webhook to the "messages" field to receive inbound messages and statuses.',
    ],
  };
}

// Dry-run preview of the Meta hub-challenge handshake. Never reads or echoes the real token unless it matches.
function webhookTestPreview(query = {}) {
  const mode = query['hub.mode'] || query.mode || 'subscribe';
  const challenge = query['hub.challenge'] || query.challenge || 'SAMPLE_CHALLENGE_123';
  const provided = query['hub.verify_token'] || query.verify_token || '';
  const configured = process.env[VERIFY_TOKEN_ENV];

  let wouldVerify;
  let reason;
  if (!configured) {
    wouldVerify = false;
    reason = `${VERIFY_TOKEN_ENV} is not set in .env`;
  } else if (!provided) {
    wouldVerify = null;
    reason = 'No verify token supplied in this preview (token comparison skipped).';
  } else {
    wouldVerify = mode === 'subscribe' && provided === configured;
    reason = wouldVerify ? 'Mode is subscribe and token matches env value.' : 'Mode/token mismatch.';
  }

  return {
    ok: true,
    dryRun: true,
    liveSend: false,
    mode,
    verifyTokenConfigured: !!configured,
    wouldVerify,
    reason,
    // We echo the challenge only as a *preview* of what the live route would return on success.
    previewResponseBody: wouldVerify === true ? String(challenge) : null,
  };
}

module.exports = { webhookInfo, webhookTestPreview, expectedWebhookUrl, VERIFY_TOKEN_ENV };
