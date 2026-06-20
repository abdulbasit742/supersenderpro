// lib/tenantIsolation/adapters/supportHelpdeskAdapter.js — Safe adapter for Support Helpdesk. Detect-only; redacted summaries; never mutates or calls external APIs.
const fs = require('fs');
const path = require('path');
const { scrub } = require('../privacyGuard');
const ROOT = path.join(__dirname, '..', '..', '..');
function available() { try { return fs.existsSync(path.join(ROOT,'routes','publicSaasFunnelRoutes.js')); } catch (_e) { return false; } }
function summary(data) {
  if (!available()) return { module: 'Support Helpdesk', available: false, reason: 'module_unavailable' };
  return { module: 'Support Helpdesk', available: true, dryRun: true, preview: scrub(data || {}) };
}
module.exports = { name: 'Support Helpdesk', available, summary };
