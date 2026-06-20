// lib/tenantIsolation/adapters/customer360Adapter.js — Safe adapter for Customer 360. Detect-only; redacted summaries; never mutates or calls external APIs.
const fs = require('fs');
const path = require('path');
const { scrub } = require('../privacyGuard');
const ROOT = path.join(__dirname, '..', '..', '..');
function available() { try { return fs.existsSync(path.join(ROOT,'lib','customer360')) || fs.existsSync(path.join(ROOT,'lib','storeCRM.js')); } catch (_e) { return false; } }
function summary(data) {
  if (!available()) return { module: 'Customer 360', available: false, reason: 'module_unavailable' };
  return { module: 'Customer 360', available: true, dryRun: true, preview: scrub(data || {}) };
}
module.exports = { name: 'Customer 360', available, summary };
