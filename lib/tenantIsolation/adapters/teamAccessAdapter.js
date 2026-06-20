// lib/tenantIsolation/adapters/teamAccessAdapter.js — Safe adapter for Team Access. Detect-only; redacted summaries; never mutates or calls external APIs.
const fs = require('fs');
const path = require('path');
const { scrub } = require('../privacyGuard');
const ROOT = path.join(__dirname, '..', '..', '..');
function available() { try { return fs.existsSync(path.join(ROOT,'lib','teamAccess')) || fs.existsSync(path.join(ROOT,'routes','teamAccessRoutes.js')); } catch (_e) { return false; } }
function summary(data) {
  if (!available()) return { module: 'Team Access', available: false, reason: 'module_unavailable' };
  return { module: 'Team Access', available: true, dryRun: true, preview: scrub(data || {}) };
}
module.exports = { name: 'Team Access', available, summary };
