// developerPortal/webhookDeliveryPreview.js — simulate (dry-run) webhook delivery. NO live calls by default.
const subs = require('./webhookSubscriptions');
const { build } = require('./webhookPayloadBuilder');
const { sign } = require('./webhookSigning');
const log = require('./webhookDeliveryLog');
const { policy, liveWebhooksAllowed } = require('./safetyGuard');
const { redact } = require('./redactor');

// status: simulated | queued_preview | blocked_by_policy | skipped_no_subscription | failed_validation | delivered_live_if_enabled
async function deliverPreview(subscriptionId, eventType, overrides={}){
  const found = subs._internal(subscriptionId);
  if (!found) return log.record({ subscriptionId, eventType, status:'skipped_no_subscription', dryRun:true });
  const { sub, secret, fullUrl } = found;

  const payload = build(eventType, overrides);
  const body = JSON.stringify(payload);
  const signature = secret ? sign(secret, body) : 'sha256=preview';

  const base = {
    subscriptionId, eventType,
    payloadPreview: redact(payload),
    signaturePreview: signature.slice(0,18)+'...',
    attemptCount: 1,
    dryRun: true,
  };

  // Live delivery is ONLY allowed when policy explicitly permits AND subscription is not disabled.
  if (liveWebhooksAllowed() && sub.deliveryMode !== 'disabled' && fullUrl){
    try {
      const controller = new AbortController();
      const t = setTimeout(()=>controller.abort(), 8000);
      const resp = await fetch(fullUrl, { method:'POST',
        headers:{ 'Content-Type':'application/json', 'X-SuperSender-Event':eventType, 'X-SuperSender-Signature':signature },
        body, signal: controller.signal });
      clearTimeout(t);
      return log.record({ ...base, dryRun:false, status:'delivered_live_if_enabled', responsePreview:{ httpStatus: resp.status } });
    } catch (err){
      return log.record({ ...base, dryRun:false, status:'failed_validation', responsePreview:{ error: String(err.message).slice(0,120) } });
    }
  }

  // Default: simulate only. If approval required, mark queued_preview.
  const status = policy().requireApprovalForWebhooks ? 'queued_preview' : 'simulated';
  return log.record({ ...base, status, responsePreview:{ note:'No live HTTP call — dry-run simulation only.' } });
}
module.exports = { deliverPreview };
