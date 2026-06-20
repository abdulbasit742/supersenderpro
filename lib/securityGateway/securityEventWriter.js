// lib/securityGateway/securityEventWriter.js — Writes redacted security events. Routes to adapters when present.
// Never includes raw IP / full PII / secrets.
const crypto = require('crypto');
const { config } = require('./config');
const { Store } = require('./store');
const { scrub, safeActor, redact } = require('./privacyGuard');
const auditLedger = require('./adapters/auditLedgerAdapter');
const incidentCommand = require('./adapters/incidentCommandAdapter');
const approvalInbox = require('./adapters/approvalInboxAdapter');

const EVENT_TYPES = ['rate_limit_warning','abuse_signal_detected','public_form_abuse','webhook_abuse','scope_mismatch','tenant_isolation_warning','raw_export_attempt','live_action_blocked','suspicious_payload','secret_in_payload','pii_in_payload','admin_route_warning','generic_security_warning'];

function id() { return `sev_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`; }

function write(input = {}) {
  const actor = safeActor(input);
  const event = {
    id: id(),
    eventType: EVENT_TYPES.includes(input.eventType) ? input.eventType : 'generic_security_warning',
    source: String(input.source || 'security-gateway').slice(0, 60),
    route: String(input.route || '').slice(0, 120),
    actorSafe: actor.label,
    ipHash: actor.ipHash,
    userAgentHash: actor.userAgentHash,
    riskLevel: ['low','medium','high','critical'].includes(input.riskLevel) ? input.riskLevel : 'low',
    abuseScore: Number.isFinite(Number(input.abuseScore)) ? Number(input.abuseScore) : 0,
    summary: redact(String(input.summary || '')).slice(0, 200),
    metadataRedacted: scrub(input.metadata || {}),
    dryRun: config.enforce !== true,
    createdAt: new Date().toISOString(),
  };
  Store.addEvent(event);
  const routed = { audit: false, incident: false, approval: false };
  try {
    if (auditLedger.available()) { auditLedger.notify({ type: event.eventType, riskLevel: event.riskLevel, summary: event.summary }); routed.audit = true; }
    if ((event.riskLevel === 'high' || event.riskLevel === 'critical') && incidentCommand.available()) { incidentCommand.notify({ type: event.eventType, riskLevel: event.riskLevel }); routed.incident = true; }
    if (input.needsReview && approvalInbox.available()) { approvalInbox.notify({ type: event.eventType, summary: event.summary }); routed.approval = true; }
  } catch (_e) { /* adapters are best-effort, non-fatal */ }
  return { event, routed };
}

function list(limit) { return Store.listEvents(limit); }
function get(idVal) { return Store.getEvent(idVal); }

module.exports = { write, list, get, EVENT_TYPES };
