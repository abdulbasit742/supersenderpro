// lib/tenantIsolation/adapters/ownerCommandAdapter.js — Safe adapter for Owner Command. Detect-only; redacted summaries; never mutates or calls external APIs.
const fs = require('fs');
const path = require('path');
const { scrub } = require('../privacyGuard');
const ROOT = path.join(__dirname, '..', '..', '..');
function available() { try { return fs.existsSync(path.join(ROOT,'lib','ownerBriefing')); } catch (_e) { return false; } }
function summary(data) {
  if (!available()) return { module: 'Owner Command', available: false, reason: 'module_unavailable' };
  return { module: 'Owner Command', available: true, dryRun: true, preview: scrub(data || {}) };
}
module.exports = { name: 'Owner Command', available, summary };
