// lib/securityGateway/adapters/deploymentCommandAdapter.js — Safe adapter for Deployment Command.
// Detects module presence; returns unavailable safely if missing. Sends redacted summaries only.
const fs = require('fs');
const path = require('path');
const { scrub } = require('../privacyGuard');
const ROOT = path.join(__dirname, '..', '..', '..');

function available() { try { return fs.existsSync(path.join(ROOT,'deploy')) || fs.existsSync(path.join(ROOT,'deploy.sh')); } catch (_e) { return false; } }
function notify(summary) {
  if (!available()) return { module: 'Deployment Command', available: false, delivered: false, reason: 'module_unavailable' };
  // Dry-run: record intent only. Never mutates source module, never calls external APIs.
  return { module: 'Deployment Command', available: true, delivered: false, dryRun: true, payload: scrub(summary) };
}
module.exports = { name: 'Deployment Command', available, notify };
