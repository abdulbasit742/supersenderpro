// lib/securityGateway/privacyGuard.js — Central privacy posture. Enforces redaction + hashing policy.
const { config } = require('./config');
const { redact, redactObject, hasLeak } = require('./redactor');
const { hashIp, hashUserAgent } = require('./hashUtils');

// Build a safe, redacted actor preview from a request-like context. Never returns raw IP/PII.
function safeActor(ctx = {}) {
  const ipHash = config.hashIp ? hashIp(ctx.ip) : 'iph_disabled';
  const userAgentHash = hashUserAgent(ctx.userAgent);
  let label = ctx.actorLabel || ctx.appId || ctx.tenantId || ctx.resellerId || 'anonymous';
  return { label: redact(String(label)).slice(0, 40), ipHash, userAgentHash };
}

function scrub(obj) { return config.redactPii || config.redactSecrets ? redactObject(obj) : obj; }

function posture() {
  return {
    rawIpDisabled: config.hashIp,
    piiRedacted: config.redactPii,
    secretsRedacted: config.redactSecrets,
    rawExportAllowed: config.allowRawExport,
    enforcementEnabled: config.enforce,
    dryRun: config.dryRun,
  };
}

module.exports = { safeActor, scrub, posture, hasLeak, redact };
