// lib/securityGateway/adapters/supportHelpdeskAdapter.js — Safe adapter for Support Helpdesk.
// Detects module presence; returns unavailable safely if missing. Sends redacted summaries only.
const fs = require('fs');
const path = require('path');
const { scrub } = require('../privacyGuard');
const ROOT = path.join(__dirname, '..', '..', '..');

function available() { try { return fs.existsSync(path.join(ROOT,'routes','publicSaasFunnelRoutes.js')); } catch (_e) { return false; } }
function notify(summary) {
  if (!available()) return { module: 'Support Helpdesk', available: false, delivered: false, reason: 'module_unavailable' };
  // Dry-run: record intent only. Never mutates source module, never calls external APIs.
  return { module: 'Support Helpdesk', available: true, delivered: false, dryRun: true, payload: scrub(summary) };
}
module.exports = { name: 'Support Helpdesk', available, notify };
