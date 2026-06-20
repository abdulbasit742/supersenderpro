// lib/saasBilling/routeGuard.js — Optional express middleware factories for gating.
// These are OPT-IN. server.js does not auto-apply them. Even when applied, they only
// block when live enforcement is enabled and the path is non-critical; otherwise they
// attach req.saasBilling and call next().

const featureGate = require('./featureGate');
const safetyGuard = require('./safetyGuard');

// Resolve tenant id from common request shapes (header, query, body, params, user).
function resolveTenantId(req) {
  return (
    req.get && (req.get('x-tenant-id')) ||
    (req.query && (req.query.tenantId || req.query.tenant)) ||
    (req.body && (req.body.tenantId || req.body.tenant)) ||
    (req.params && req.params.tenantId) ||
    (req.user && (req.user.tenantId || req.user.sub)) ||
    'default'
  );
}

// Gate a route by feature (and optionally a usage metric).
function requireFeature(feature, opts = {}) {
  return function saasFeatureGate(req, res, next) {
    try {
      const tenantId = resolveTenantId(req);
      const decision = featureGate.check({ tenantId, feature, action: opts.action || req.path, metric: opts.metric });
      req.saasBilling = decision;
      if (decision.blocked && !safetyGuard.isProtectedAction(req.path)) {
        return res.status(402).json({
          success: false, error: 'Plan limit reached', warnOnly: false,
          feature, reason: decision.reason, upgradeRequired: decision.upgradeRequired, suggestedPlan: decision.suggestedPlan,
        });
      }
      if (!decision.softAllowed) res.setHeader('X-SaaS-Billing-Warning', decision.reason);
      return next();
    } catch (_e) { return next(); } // never break a route due to billing
  };
}

module.exports = { requireFeature, resolveTenantId };
