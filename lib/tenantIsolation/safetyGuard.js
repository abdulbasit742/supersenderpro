// lib/tenantIsolation/safetyGuard.js — Safety posture helpers. Non-destructive, no raw export by default.
const { config } = require('./config');
function isDryRun() { return config.dryRun === true; }
function guardRawExport(requested) {
  const allowed = config.allowRawExport === true;
  return { requested: !!requested, allowed, blocked: !!requested && !allowed, reason: allowed ? 'raw_export_enabled' : 'raw_export_disabled_redacted_only' };
}
function assertNonDestructive(action) { return { action: String(action || 'unknown'), destructiveBlocked: true, dryRun: isDryRun() }; }
module.exports = { isDryRun, guardRawExport, assertNonDestructive };
