// lib/tenantIsolation/adapters/developerPortalAdapter.js — Safe adapter for Developer Portal. Detect-only; redacted summaries; never mutates or calls external APIs.
const fs = require('fs');
const path = require('path');
const { scrub } = require('../privacyGuard');
const ROOT = path.join(__dirname, '..', '..', '..');
function available() { try { return fs.existsSync(path.join(ROOT,'lib','developerPortal')); } catch (_e) { return false; } }
function summary(data) {
  if (!available()) return { module: 'Developer Portal', available: false, reason: 'module_unavailable' };
  return { module: 'Developer Portal', available: true, dryRun: true, preview: scrub(data || {}) };
}
module.exports = { name: 'Developer Portal', available, summary };
