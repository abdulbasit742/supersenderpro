// developerPortal/webhookEventCatalog.js — catalog of webhook events with redacted examples.
const { SCHEMAS } = require('./eventSchemas');
function buildEntry(eventType){
  const s = SCHEMAS[eventType] || { schema:{}, example:{}, piiRisk:'unknown' };
  const [module] = eventType.split('.');
  return {
    eventType, module,
    description: `Fired (preview) when: ${eventType.replace(/[._]/g,' ')}`,
    payloadSchema: s.schema,
    redactedExample: s.example,
    piiRisk: s.piiRisk,
    deliveryDefault: 'dry_run',
    retryPolicyPreview: { maxAttempts: 5, backoff: 'exponential', baseSeconds: 30 },
    enabled: true,
  };
}
function list(){ return Object.keys(SCHEMAS).map(buildEntry); }
function get(eventType){ return SCHEMAS[eventType] ? buildEntry(eventType) : null; }
function eventTypes(){ return Object.keys(SCHEMAS); }
module.exports = { list, get, eventTypes };
