  'use strict';
  /**

   * routeGuard.js — requireAdminAuth(options) Express guard.
   * options: { module, permission, allowDemo, requireLogin }
   *
   * Behavior:
   * - If admin-auth disabled -> pass through (no-op).
   *     - If authenticated -> pass (optionally hand off to RBAC requirePermission).
   *     - If not authenticated:
   *           demo/local mode (requireLogin false) -> WARN via header, allow through.
   *           requireLogin true -> 401 JSON, safe shape, no stack trace.
   * Never exposes tokens or stack traces.
   */
const { config } = require('./authConfig');

function tryRbac(permission) {
 if (!permission) return null;
       try {
         const rbac = require('../../src/modules/rbac'); // existing module, optional
         if (rbac && typeof rbac.requirePermission === 'function') return rbac.requirePermission(permission);
       } catch (e) { /* RBAC not present; fall back to auth-only */ }
       return null;
}


function requireAdminAuth(options) {
       const opts = options || {};
       return function (req, res, next) {
         const c = config();
         if (!c.enabled) return next();


         const requireLogin = opts.requireLogin != null ? !!opts.requireLogin : c.requireLogin;
         const allowDemo = opts.allowDemo != null ? !!opts.allowDemo : c.demoMode;
         const authed = !!(req.adminAuth && req.adminAuth.authenticated);


         if (authed) {
             const rbacMw = tryRbac(opts.permission);
             if (rbacMw) return rbacMw(req, res, next);
             return next();
         }


         // Not authenticated.
         if (!requireLogin && allowDemo) {
           res.setHeader('X-Admin-Auth-Warning', 'unauthenticated-demo-mode');
             return next();
         }


         return res.status(401).json({
             ok: false,
             status: 'unauthorized',
             message: 'Admin login required.',
             dryRun: true,
             liveActionsEnabled: false,
             timestamp: new Date().toISOString(),
         });
       };
}


module.exports = { requireAdminAuth, tryRbac };
