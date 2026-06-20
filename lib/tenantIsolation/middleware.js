// lib/tenantIsolation/middleware.js — Optional Express middleware. Default dry-run/report-only. Does not block existing routes.
const evaluator = require('./isolationEvaluator');
const leakDetector = require('./leakDetector');
const { config } = require('./config');

function buildCtx(req, extra) { return { route: req.originalUrl || req.url, authPresent: !!(req.headers && (req.headers.authorization || (req.session && req.session.user))), ...extra }; }
function makeGuard(boundaryType) {
  return function (options = {}) {
    return function (req, res, next) {
      try { req.tenantIsolation = evaluator.decide(buildCtx(req, { boundaryType, ...options, ...(req.body || {}) })); if (!config.dryRun && req.tenantIsolation.allowed === false) return res.status(403).json({ ok: false, error: 'boundary_violation' }); } catch (_e) { /* never break route */ }
      next();
    };
  };
}
const tenantBoundaryGuard = makeGuard('tenant');
const resellerBoundaryGuard = makeGuard('reseller');
const workspaceBoundaryGuard = makeGuard('workspace');
const developerScopeBoundaryGuard = makeGuard('developer_api');
function publicResponseRedactionGuard(options = {}) {
  return function (req, res, next) {
    const orig = res.json.bind(res);
    res.json = (body) => { try { const r = leakDetector.detect(body, { route: req.originalUrl }); if (r.leakFound && req.tenantIsolation) req.tenantIsolation.leak = r; } catch (_e) { /* noop */ } return orig(body); };
    next();
  };
}
function exportBoundaryGuard(options = {}) {
  return function (req, res, next) { req.tenantIsolation = require('./safetyGuard').guardRawExport(true); next(); };
}
module.exports = { tenantBoundaryGuard, resellerBoundaryGuard, workspaceBoundaryGuard, developerScopeBoundaryGuard, publicResponseRedactionGuard, exportBoundaryGuard };
