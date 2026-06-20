// lib/tenantIsolation/adapters/auditLedgerAdapter.js — Safe adapter for Audit Ledger. Detect-only; redacted summaries; never mutates or calls external APIs.
const fs = require('fs');
const path = require('path');
const { scrub } = require('../privacyGuard');
const ROOT = path.join(__dirname, '..', '..', '..');
function available() { try { return fs.existsSync(path.join(ROOT,'lib','complianceCenter','auditLog.js')); } catch (_e) { return false; } }
function summary(data) {
  if (!available()) return { module: 'Audit Ledger', available: false, reason: 'module_unavailable' };
  return { module: 'Audit Ledger', available: true, dryRun: true, preview: scrub(data || {}) };
}
module.exports = { name: 'Audit Ledger', available, summary };
