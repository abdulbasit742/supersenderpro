// lib/securityGateway/scopeGuard.js — Developer API scope enforcement PREVIEW. Report-only by default.
const { config } = require('./config');

function check(ctx = {}) {
  const required = ctx.requiredScope;
  const provided = Array.isArray(ctx.providedScopes) ? ctx.providedScopes : [];
  const mismatch = required ? !provided.includes(required) : false;
  return {
    requiredScope: required || null,
    providedScopeCount: provided.length,
    mismatch,
    allowed: !mismatch || config.enforce !== true, // preview: not blocked unless enforcing
    wouldBlockLive: mismatch && config.enforce === true,
    dryRun: config.enforce !== true,
  };
}
module.exports = { check };
