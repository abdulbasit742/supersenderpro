// lib/tenantIsolation/adapters/resellerPortalAdapter.js — Safe adapter for Reseller Portal. Detect-only; redacted summaries; never mutates or calls external APIs.
const fs = require('fs');
const path = require('path');
const { scrub } = require('../privacyGuard');
const ROOT = path.join(__dirname, '..', '..', '..');
function available() { try { return fs.existsSync(path.join(ROOT,'lib','resellerNetwork.js')) || fs.existsSync(path.join(ROOT,'lib','saasBilling')); } catch (_e) { return false; } }
function summary(data) {
  if (!available()) return { module: 'Reseller Portal', available: false, reason: 'module_unavailable' };
  return { module: 'Reseller Portal', available: true, dryRun: true, preview: scrub(data || {}) };
}
module.exports = { name: 'Reseller Portal', available, summary };
