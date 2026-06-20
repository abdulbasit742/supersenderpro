// lib/tenantIsolation/adapters/publicFunnelAdapter.js — Safe adapter for Public Funnel. Detect-only; redacted summaries; never mutates or calls external APIs.
const fs = require('fs');
const path = require('path');
const { scrub } = require('../privacyGuard');
const ROOT = path.join(__dirname, '..', '..', '..');
function available() { try { return fs.existsSync(path.join(ROOT,'routes','publicSaasFunnelRoutes.js')); } catch (_e) { return false; } }
function summary(data) {
  if (!available()) return { module: 'Public Funnel', available: false, reason: 'module_unavailable' };
  return { module: 'Public Funnel', available: true, dryRun: true, preview: scrub(data || {}) };
}
module.exports = { name: 'Public Funnel', available, summary };
