// lib/securityGateway/adapters/developerPortalAdapter.js — Safe adapter for Developer Portal.
// Detects module presence; returns unavailable safely if missing. Sends redacted summaries only.
const fs = require('fs');
const path = require('path');
const { scrub } = require('../privacyGuard');
const ROOT = path.join(__dirname, '..', '..', '..');

function available() { try { return fs.existsSync(path.join(ROOT,'lib','unifiedSetup')) || fs.existsSync(path.join(ROOT,'routes','unifiedSetupRoutes.js')); } catch (_e) { return false; } }
function notify(summary) {
  if (!available()) return { module: 'Developer Portal', available: false, delivered: false, reason: 'module_unavailable' };
  // Dry-run: record intent only. Never mutates source module, never calls external APIs.
  return { module: 'Developer Portal', available: true, delivered: false, dryRun: true, payload: scrub(summary) };
}
module.exports = { name: 'Developer Portal', available, notify };
