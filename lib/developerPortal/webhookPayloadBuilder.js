// developerPortal/webhookPayloadBuilder.js — builds a redacted, signed payload preview for an event.
const { get } = require('./webhookEventCatalog');
const { redactEvent } = require('./eventRedactor');

function build(eventType, overrides={}){
  const entry = get(eventType);
  const base = entry ? entry.redactedExample : { message: 'unknown event' };
  const data = redactEvent({ ...base, ...overrides });
  return {
    event: eventType,
    apiVersion: '1.0.0-preview',
    deliveryId: 'dlv_preview_' + Date.now(),
    data,
    timestamp: new Date().toISOString(),
  };
}
module.exports = { build };
