'use strict';

/**
 * WhatsApp Cloud API webhook diagnostics (advisory only).
 * - No secrets are exposed.
 * - No Meta app is created or contacted.
 * - Returns expected-behavior descriptions + checklists.
 */

const { boolEnv, isSet } = require('./configInspector');

function diagnose() {
  const verifyTokenSet = isSet(process.env.WHATSAPP_CLOUD_VERIFY_TOKEN);
  const webhookSecretSet = isSet(process.env.WHATSAPP_CLOUD_WEBHOOK_SECRET);
  const enabled = boolEnv('WHATSAPP_CLOUD_API_ENABLED', false);

  const issues = [];
  if (!verifyTokenSet) issues.push('WHATSAPP_CLOUD_VERIFY_TOKEN missing: GET verification handshake will fail.');
  if (!webhookSecretSet) issues.push('WHATSAPP_CLOUD_WEBHOOK_SECRET missing: cannot verify X-Hub-Signature-256 on POST events.');

  return {
    verifyTokenStatus: verifyTokenSet ? 'set' : 'missing',
      webhookSecretStatus: webhookSecretSet ? 'set' : 'missing',
      cloudApiEnabled: enabled,
      expectedBehavior: {
        verifyRoute: {
           method: 'GET',
           purpose: 'Meta calls this once to verify the webhook.',
        rule: 'If hub.mode=subscribe AND hub.verify_token === WHATSAPP_CLOUD_VERIFY_TOKEN, respond 200 with hub.challenge; otherwise respond 403.',
        },
        postWebhook: {
           method: 'POST',
           purpose: 'Receives message + status events.',
        rule: 'Verify X-Hub-Signature-256 (HMAC-SHA256 of raw body using app secret) before processing. Respond 200 quickly; process async.',
        },
      },
      recommendedPublicUrlChecklist: [
        'Expose a stable HTTPS public URL (no self-signed cert).',
        'Webhook path should be distinct from existing routes (e.g. /webhook/whatsapp-cloud).',
        'For local dev, use a tunnel (ngrok/cloudflared) but never as production.',
        'Confirm the public URL responds to GET verification before subscribing.',
      ],
    signatureVerificationRecommendation: 'Always validate X-Hub-Signature-256 against the raw request body using WHATSAPP_CLOUD_WEBHOOK_SECRET. Reject mismatches with 401. Never log the secret or the signature.',

    eventSubscriptionChecklist: [
       'Subscribe the WABA to the app webhook.',
       'Enable fields: messages, message_template_status_update.',
       'Verify a test event is received and acknowledged with 200.',
       'Confirm existing Cloud API route handlers are not disrupted.',
    ],
    issues: issues,
  note: 'Advisory only. This wizard does not register webhooks or contact Meta. Baileys/local webhook flow is untouched.',
  };
}

module.exports = { diagnose };
