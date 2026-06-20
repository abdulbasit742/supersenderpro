// lib/securityGateway/safetyGuard.js — Central safety posture helpers. Non-destructive by default.
const { config } = require('./config');

function isEnforceEnabled() { return config.enforce === true; }
function isDryRun() { return config.enforce !== true; }
// Raw export is blocked unless explicitly allowed. Returns a preview decision; never performs raw export here.
function guardRawExport(requested) {
  const allowed = config.allowRawExport === true;
  return { requested: !!requested, allowed, blocked: !!requested && !allowed, reason: allowed ? 'raw_export_enabled' : 'raw_export_disabled_redacted_only' };
}
function assertNonDestructive(action) { return { action: String(action || 'unknown'), destructiveBlocked: true, dryRun: isDryRun() }; }

module.exports = { isEnforceEnabled, isDryRun, guardRawExport, assertNonDestructive };
