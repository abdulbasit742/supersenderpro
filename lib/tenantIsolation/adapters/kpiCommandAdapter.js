// lib/tenantIsolation/adapters/kpiCommandAdapter.js — Safe adapter for KPI Command. Detect-only; redacted summaries; never mutates or calls external APIs.
const fs = require('fs');
const path = require('path');
const { scrub } = require('../privacyGuard');
const ROOT = path.join(__dirname, '..', '..', '..');
function available() { try { return fs.existsSync(path.join(ROOT,'lib','ownerBriefing')) || fs.existsSync(path.join(ROOT,'lib','aiDashboard.js')); } catch (_e) { return false; } }
function summary(data) {
  if (!available()) return { module: 'KPI Command', available: false, reason: 'module_unavailable' };
  return { module: 'KPI Command', available: true, dryRun: true, preview: scrub(data || {}) };
}
module.exports = { name: 'KPI Command', available, summary };
