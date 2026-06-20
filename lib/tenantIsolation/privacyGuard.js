// lib/tenantIsolation/privacyGuard.js — Central privacy posture + safe identifier hashing.
const crypto = require('crypto');
const { config } = require('./config');
const { redact, redactObject, hasLeak } = require('./redactor');
function hashId(prefix, value) { if (!value) return `${prefix || 'id'}_none`; const h = crypto.createHash('sha256').update(`${config.hashSalt}:${value}`).digest('hex').slice(0, 16); return `${prefix || 'id'}_${h}`; }
function safeActorId(id) { return id ? hashId('act', id) : 'act_anon'; }
function scrub(obj) { return (config.redactPii || config.redactSecrets) ? redactObject(obj) : obj; }
function posture() {
  return {
    dryRun: config.dryRun, piiRedacted: config.redactPii, secretsRedacted: config.redactSecrets,
    crossTenantBlocked: config.blockCrossTenant, rawExportAllowed: config.allowRawExport, noDestructive: true,
  };
}
module.exports = { hashId, safeActorId, scrub, posture, redact, hasLeak };
