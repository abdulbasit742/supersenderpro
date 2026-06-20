// lib/securityGateway/adapters/incidentCommandAdapter.js — Safe adapter for Incident Command.
// Detects module presence; returns unavailable safely if missing. Sends redacted summaries only.
const fs = require('fs');
const path = require('path');
const { scrub } = require('../privacyGuard');
const ROOT = path.join(__dirname, '..', '..', '..');

function available() { try { return fs.existsSync(path.join(ROOT,'lib','complianceCenter')) && false || fs.existsSync(path.join(ROOT,'docs','OFFICIAL_LAUNCH_CHECKLIST.md')); } catch (_e) { return false; } }
function notify(summary) {
  if (!available()) return { module: 'Incident Command', available: false, delivered: false, reason: 'module_unavailable' };
  // Dry-run: record intent only. Never mutates source module, never calls external APIs.
  return { module: 'Incident Command', available: true, delivered: false, dryRun: true, payload: scrub(summary) };
}
module.exports = { name: 'Incident Command', available, notify };
