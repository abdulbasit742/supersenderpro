// lib/tenantIsolation/adapters/securityGatewayAdapter.js — Safe adapter for Security Gateway. Detect-only; redacted summaries; never mutates or calls external APIs.
const fs = require('fs');
const path = require('path');
const { scrub } = require('../privacyGuard');
const ROOT = path.join(__dirname, '..', '..', '..');
function available() { try { return fs.existsSync(path.join(ROOT,'lib','securityGateway')); } catch (_e) { return false; } }
function summary(data) {
  if (!available()) return { module: 'Security Gateway', available: false, reason: 'module_unavailable' };
  return { module: 'Security Gateway', available: true, dryRun: true, preview: scrub(data || {}) };
}
module.exports = { name: 'Security Gateway', available, summary };
