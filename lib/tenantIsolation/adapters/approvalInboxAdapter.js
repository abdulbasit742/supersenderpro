// lib/tenantIsolation/adapters/approvalInboxAdapter.js — Safe adapter for Approval Inbox. Detect-only; redacted summaries; never mutates or calls external APIs.
const fs = require('fs');
const path = require('path');
const { scrub } = require('../privacyGuard');
const ROOT = path.join(__dirname, '..', '..', '..');
function available() { try { return fs.existsSync(path.join(ROOT,'lib','complianceCenter')); } catch (_e) { return false; } }
function summary(data) {
  if (!available()) return { module: 'Approval Inbox', available: false, reason: 'module_unavailable' };
  return { module: 'Approval Inbox', available: true, dryRun: true, preview: scrub(data || {}) };
}
module.exports = { name: 'Approval Inbox', available, summary };
