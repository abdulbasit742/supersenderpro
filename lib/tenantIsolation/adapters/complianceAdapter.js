// lib/tenantIsolation/adapters/complianceAdapter.js — Safe adapter for Compliance Center. Detect-only; redacted summaries; never mutates or calls external APIs.
const fs = require('fs');
const path = require('path');
const { scrub } = require('../privacyGuard');
const ROOT = path.join(__dirname, '..', '..', '..');
function available() { try { return fs.existsSync(path.join(ROOT,'lib','complianceCenter','index.js')); } catch (_e) { return false; } }
function summary(data) {
  if (!available()) return { module: 'Compliance Center', available: false, reason: 'module_unavailable' };
  return { module: 'Compliance Center', available: true, dryRun: true, preview: scrub(data || {}) };
}
module.exports = { name: 'Compliance Center', available, summary };
