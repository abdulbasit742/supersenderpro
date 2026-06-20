// lib/tenantIsolation/adapters/pilotOpsAdapter.js — Safe adapter for Pilot Ops. Detect-only; redacted summaries; never mutates or calls external APIs.
const fs = require('fs');
const path = require('path');
const { scrub } = require('../privacyGuard');
const ROOT = path.join(__dirname, '..', '..', '..');
function available() { try { return fs.existsSync(path.join(ROOT,'lib','pilotOps')) || fs.existsSync(path.join(ROOT,'docs','PILOT_LAUNCH_GUIDE.md')); } catch (_e) { return false; } }
function summary(data) {
  if (!available()) return { module: 'Pilot Ops', available: false, reason: 'module_unavailable' };
  return { module: 'Pilot Ops', available: true, dryRun: true, preview: scrub(data || {}) };
}
module.exports = { name: 'Pilot Ops', available, summary };
