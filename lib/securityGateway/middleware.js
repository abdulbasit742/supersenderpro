// lib/securityGateway/middleware.js — Optional Express middleware helpers. Default report-only / dry-run.
// These DO NOT block existing routes. They attach a redacted req.securityGateway decision and continue.
const gateway = require('./securityGateway');
const { config } = require('./config');
const eventWriter = require('./securityEventWriter');

function buildCtx(req, extra = {}) {
  return {
    ip: req.ip || (req.headers && (req.headers['x-forwarded-for'] || req.headers['x-real-ip'])) || (req.connection && req.connection.remoteAddress),
    userAgent: req.headers && req.headers['user-agent'],
    route: req.originalUrl || req.url,
    payload: req.body,
    authPresent: !!(req.headers && (req.headers.authorization || (req.session && req.session.user))),
    ...extra,
  };
}

function securityGatewayMiddleware(policyName) {
  return function (req, res, next) {
    try {
      const decision = gateway.evaluate(buildCtx(req, { scope: policyName || 'generic' }));
      req.securityGateway = decision;
      if (decision.rate && decision.rate.warning) eventWriter.write({ eventType: 'rate_limit_warning', source: 'middleware', route: req.originalUrl, riskLevel: 'medium', summary: `rate limit warning (${policyName})`, ip: req.ip, userAgent: req.headers && req.headers['user-agent'] });
      if (config.enforce && decision.blockedLive) return res.status(429).json({ ok: false, error: 'rate_limited' });
    } catch (_e) { /* never break the route */ }
    next();
  };
}
function publicFormGuard(formName) { return securityGatewayMiddleware('public_form'); }
function developerApiGuard(scope) { return securityGatewayMiddleware('developer_api'); }
function webhookGuard(eventType) { return securityGatewayMiddleware('webhook'); }
function adminRouteGuard(routeName) { return securityGatewayMiddleware('admin_api'); }
function tenantIsolationGuardMiddleware() { return securityGatewayMiddleware('tenant_portal'); }

module.exports = { securityGatewayMiddleware, publicFormGuard, developerApiGuard, webhookGuard, adminRouteGuard, tenantIsolationGuardMiddleware };
