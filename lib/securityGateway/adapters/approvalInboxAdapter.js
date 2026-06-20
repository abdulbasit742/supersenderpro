// lib/securityGateway/adapters/approvalInboxAdapter.js — Safe adapter for Approval Inbox.
// Detects module presence; returns unavailable safely if missing. Sends redacted summaries only.
const fs = require('fs');
const path = require('path');
const { scrub } = require('../privacyGuard');
const ROOT = path.join(__dirname, '..', '..', '..');

function available() { try { return fs.existsSync(path.join(ROOT,'lib','complianceCenter')); } catch (_e) { return false; } }
function notify(summary) {
  if (!available()) return { module: 'Approval Inbox', available: false, delivered: false, reason: 'module_unavailable' };
  // Dry-run: record intent only. Never mutates source module, never calls external APIs.
  return { module: 'Approval Inbox', available: true, delivered: false, dryRun: true, payload: scrub(summary) };
}
module.exports = { name: 'Approval Inbox', available, notify };
