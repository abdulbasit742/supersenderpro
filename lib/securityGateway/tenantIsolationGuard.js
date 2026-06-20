// lib/securityGateway/tenantIsolationGuard.js — Tenant/reseller/client isolation safety check. Report-only by default.
const { config } = require('./config');
const { hashId } = require('./hashUtils');

function check(ctx = {}) {
  const actorTenant = ctx.actorTenant || null;
  const targetTenant = ctx.targetTenant || null;
  const mismatch = !!(actorTenant && targetTenant && actorTenant !== targetTenant);
  return {
    actorTenantHash: actorTenant ? hashId('tnt', actorTenant) : null,
    targetTenantHash: targetTenant ? hashId('tnt', targetTenant) : null,
    isolationWarning: mismatch,
    allowed: !mismatch || config.enforce !== true,
    wouldBlockLive: mismatch && config.enforce === true,
    dryRun: config.enforce !== true,
  };
}
module.exports = { check };
