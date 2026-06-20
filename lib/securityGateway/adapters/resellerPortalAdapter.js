// lib/securityGateway/adapters/resellerPortalAdapter.js — Safe adapter for Reseller Portal.
// Detects module presence; returns unavailable safely if missing. Sends redacted summaries only.
const fs = require('fs');
const path = require('path');
const { scrub } = require('../privacyGuard');
const ROOT = path.join(__dirname, '..', '..', '..');

function available() { try { return fs.existsSync(path.join(ROOT,'lib','resellerNetwork.js')) || fs.existsSync(path.join(ROOT,'lib','saasBilling')); } catch (_e) { return false; } }
function notify(summary) {
  if (!available()) return { module: 'Reseller Portal', available: false, delivered: false, reason: 'module_unavailable' };
  // Dry-run: record intent only. Never mutates source module, never calls external APIs.
  return { module: 'Reseller Portal', available: true, delivered: false, dryRun: true, payload: scrub(summary) };
}
module.exports = { name: 'Reseller Portal', available, notify };
