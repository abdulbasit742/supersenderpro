// lib/securityGateway/adapters/flowStudioAdapter.js — Safe adapter for Flow Studio.
// Detects module presence; returns unavailable safely if missing. Sends redacted summaries only.
const fs = require('fs');
const path = require('path');
const { scrub } = require('../privacyGuard');
const ROOT = path.join(__dirname, '..', '..', '..');

function available() { try { return fs.existsSync(path.join(ROOT,'docs','superflow-studio.md')) || fs.existsSync(path.join(ROOT,'docs','flow-studio-sample-flow.json')); } catch (_e) { return false; } }
function notify(summary) {
  if (!available()) return { module: 'Flow Studio', available: false, delivered: false, reason: 'module_unavailable' };
  // Dry-run: record intent only. Never mutates source module, never calls external APIs.
  return { module: 'Flow Studio', available: true, delivered: false, dryRun: true, payload: scrub(summary) };
}
module.exports = { name: 'Flow Studio', available, notify };
