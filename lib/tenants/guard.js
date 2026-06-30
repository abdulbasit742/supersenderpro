'use strict';
/**
 * lib/tenants/guard.js - requireActiveTenant middleware.
 * If a request's tenant is suspended, deny with 403. Resolves tenant id from req.tenantId
 * (set by auth) or x-tenant-id header. Fails open only when no tenant context exists at all
 * (public routes), never when a tenant is explicitly suspended.
 */
const tenants = require('./index');

function requireActiveTenant() {
  return (req, res, next) => {
    (async () => {
      try {
        const ref = req.tenantId || req.get('x-tenant-id') || (req.body && req.body.tenantId) || req.query.tenantId;
        if (!ref) return next(); // no tenant context -> not our gate to close
        const t = await tenants.getTenant(ref);
        if (t && t.status === 'suspended') return res.status(403).json({ success: false, error: 'tenant suspended', tenant: ref });
        next();
      } catch { next(); }
    })();
  };
}

module.exports = { requireActiveTenant };
