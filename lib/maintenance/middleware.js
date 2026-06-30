'use strict';
/**
 * lib/maintenance/middleware.js - enforce maintenance mode.
 * - mode 'off': pass.
 * - mode 'read-only': allow GET/HEAD; block writes (POST/PUT/PATCH/DELETE) with 503.
 * - mode 'full': block everything except the allowlist.
 * Allowlist (always reachable): /api/health*, /version, /metrics, and the maintenance route itself,
 * so probes, LB, and the admin toggle keep working.
 */
const maintenance = require('./index');
const ALLOW = [/^\/api\/health/, /^\/version/, /^\/metrics/, /^\/api\/maintenance/];
const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function maintenanceGuard() {
  return (req, res, next) => {
    const s = maintenance.state();
    if (!s || s.mode === 'off') return next();
    const p = req.path || req.url || '';
    if (ALLOW.some((re) => re.test(p))) return next();
    if (s.mode === 'read-only' && READ_METHODS.has(req.method)) return next();
    res.set('Retry-After', String(s.retryAfterSec || 120));
    return res.status(503).json({ success: false, error: 'maintenance', mode: s.mode, message: s.message, since: s.since });
  };
}

module.exports = { maintenanceGuard };
