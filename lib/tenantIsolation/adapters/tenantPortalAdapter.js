// lib/tenantIsolation/adapters/tenantPortalAdapter.js — Safe adapter for Tenant Portal. Detect-only; redacted summaries; never mutates or calls external APIs.
const fs = require('fs');
const path = require('path');
const { scrub } = require('../privacyGuard');
const ROOT = path.join(__dirname, '..', '..', '..');
function available() { try { return fs.existsSync(path.join(ROOT,'lib','saasBilling')); } catch (_e) { return false; } }
function summary(data) {
  if (!available()) return { module: 'Tenant Portal', available: false, reason: 'module_unavailable' };
  return { module: 'Tenant Portal', available: true, dryRun: true, preview: scrub(data || {}) };
}
module.exports = { name: 'Tenant Portal', available, summary };
