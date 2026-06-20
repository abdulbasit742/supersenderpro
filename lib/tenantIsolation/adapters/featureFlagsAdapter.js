// lib/tenantIsolation/adapters/featureFlagsAdapter.js — Safe adapter for Feature Flags. Detect-only; redacted summaries; never mutates or calls external APIs.
const fs = require('fs');
const path = require('path');
const { scrub } = require('../privacyGuard');
const ROOT = path.join(__dirname, '..', '..', '..');
function available() { try { return fs.existsSync(path.join(ROOT,'lib','featureFlags')); } catch (_e) { return false; } }
function summary(data) {
  if (!available()) return { module: 'Feature Flags', available: false, reason: 'module_unavailable' };
  return { module: 'Feature Flags', available: true, dryRun: true, preview: scrub(data || {}) };
}
module.exports = { name: 'Feature Flags', available, summary };
