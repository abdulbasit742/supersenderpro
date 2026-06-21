  'use strict';
  /**
   * complianceRouteGuard.js — path-scoped, method-aware guard for the existing
   * Compliance module routes (src/modules/compliance). Mounted on /api/compliance
   * BEFORE compliance.register(app), so it gates the sensitive endpoints without
   * editing the compliance module.
   *
   * Gated (require admin auth):
   *   POST /api/compliance/optout
   *     DELETE /api/compliance/optout/:number
   *     POST /api/compliance/import
   *     POST   /api/compliance/gate           (exposes blacklist membership)
   *     GET    /api/compliance/list           (exposes opt-out list / PII)
   *     GET    /api/compliance/audit          (exposes audit trail)
   *     GET    /compliance                    (dashboard page) — only if COMPLIANCE_GATE_DASHBOARD=true
   *
   * NOT gated (intentionally open):
   *     POST   /api/compliance/inbound        STOP/START webhook — auto opt-out must keep working
   *     GET    /api/compliance/status         counts only, no PII
   *
   * Reuses lib/adminAuth requireAdminAuth (+ RBAC 'compliance.manage' hand-off when present).
   * Never throws, never leaks stack traces.
   */
  const { requireAdminAuth } = require('./routeGuard');
  let attach = null;
  try { attach = require('./authMiddleware').attach; } catch (e) { attach = null; }

  function bool(v, dflt) { if (v == null || v === '') return dflt; return String(v).toLowerCase() === 'true'; }

  // The guard requires login for compliance specifically, regardless of the global
  // demo default, because these endpoints expose/modify real consent data.
  const guard = requireAdminAuth({ module: 'compliance', permission: 'compliance.manage', requireLogin: true, allowDemo:
  false });

  // Is this request one of the protected compliance operations?
  function isProtected(req) {
    const m = (req.method || 'GET').toUpperCase();
       // req.path here is relative to the mount point (/api/compliance) OR absolute;
       // normalize by stripping any /api/compliance prefix.
       const p = String(req.path || req.url || '').replace(/^\/api\/compliance/, '') || '/';

       if (m === 'POST' && p === '/optout') return true;

   if (m === 'DELETE' && /^\/optout\//.test(p)) return true;
   if (m === 'POST' && p === '/import') return true;
   if (m === 'POST' && p === '/gate') return true;
   if (m === 'GET' && p === '/list') return true;
   if (m === 'GET' && p === '/audit') return true;

   // Never gate the inbound STOP/START webhook or the status counts.
   if (p === '/inbound' || p === '/status') return false;
   return false;
}

// Express middleware for the /api/compliance mount.
function apiGuard() {
   return function (req, res, next) {
     try {
         if (!isProtected(req)) return next();
         return guard(req, res, next);
     } catch (e) {
       return res.status(500).json({ ok: false, error: 'internal_error' });
     }
   };
}


// Optional separate guard for the /compliance dashboard page.
function dashboardGuard() {
   const on = bool(process.env.COMPLIANCE_GATE_DASHBOARD, true);
   return function (req, res, next) {
     if (!on) return next();
     try { return guard(req, res, next); } catch (e) { return res.status(500).json({ ok: false, error: 'internal_error'
}); }
 };
}


module.exports = { apiGuard, dashboardGuard, isProtected, attach };
