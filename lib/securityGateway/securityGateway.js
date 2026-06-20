// lib/securityGateway/securityGateway.js — High-level orchestrator combining policy + rate limit + abuse + validation.
// Coordination layer only. Dry-run / report-only by default. No external calls; non-destructive.
const { config } = require('./config');
const policy = require('./securityPolicy');
const rateLimiter = require('./rateLimiter');
const abuseDetector = require('./abuseDetector');
const inputValidator = require('./inputValidator');
const scopeGuard = require('./scopeGuard');
const tenantIsolationGuard = require('./tenantIsolationGuard');
const eventWriter = require('./securityEventWriter');
const { posture, safeActor } = require('./privacyGuard');

function status() {
  policy.seedDefaults();
  return {
    enabled: config.enabled,
    dryRun: config.enforce !== true,
    enforce: config.enforce,
    posture: posture(),
    policyCount: policy.list().length,
    recentEvents: eventWriter.list(5).length,
  };
}

// Evaluate a request context across all layers. Produces a redacted, report-only decision.
function evaluate(ctx = {}) {
  const rate = rateLimiter.check(ctx);
  const abuse = abuseDetector.check(ctx);
  const scope = ctx.requiredScope ? scopeGuard.check(ctx) : null;
  const tenant = (ctx.actorTenant || ctx.targetTenant) ? tenantIsolationGuard.check(ctx) : null;
  const recommendedAction = abuse.riskLevel === 'critical' ? 'review_required' : (rate.over ? 'rate_limit_warning' : 'allow_monitor');
  return {
    actorSafe: safeActor(ctx).label,
    rate,
    abuse,
    scope,
    tenant,
    blockedLive: !!(rate.blockedLive || (scope && scope.wouldBlockLive) || (tenant && tenant.wouldBlockLive)),
    dryRun: config.enforce !== true,
    recommendedAction,
  };
}

module.exports = { status, evaluate, policy, rateLimiter, abuseDetector, inputValidator, scopeGuard, tenantIsolationGuard, eventWriter };
