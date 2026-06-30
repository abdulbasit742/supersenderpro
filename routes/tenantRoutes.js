'use strict';
/**
 * routes/tenantRoutes.js - tenant management API. Mounted at /api/tenants (see TENANTS HOOK / bootstrap).
 * Platform-admin guarded: requires PLATFORM_ADMIN_SECRET (x-platform-secret) since these are
 * cross-tenant operations, distinct from a tenant's own owner/admin.
 */
const express = require('express');
const tenants = require('../lib/tenants');

const router = express.Router();
function platformGuard(req, res, next) {
  const configured = process.env.PLATFORM_ADMIN_SECRET || process.env.ADMIN_TOKEN || '';
  if (!configured) { console.warn('[Tenants] no platform secret set - allowing in dev mode'); return next(); }
  const provided = req.get('x-platform-secret') || req.query.secret || (req.body && req.body.secret);
  if (provided && provided === configured) return next();
  return res.status(401).json({ success: false, error: 'Unauthorized (platform admin)' });
}
const ok = (res, d) => res.json(Object.assign({ success: true }, d));
const fail = (res, e, c = 400) => res.status(c).json({ success: false, error: e && e.message ? e.message : String(e) });

router.get('/', platformGuard, async (req, res) => { try { ok(res, { tenants: await tenants.listTenants({ status: req.query.status }) }); } catch (e) { fail(res, e, 500); } });
router.post('/', platformGuard, async (req, res) => { try { ok(res, { tenant: await tenants.createTenant(req.body || {}) }); } catch (e) { fail(res, e); } });
router.get('/:id', platformGuard, async (req, res) => { try { const t = await tenants.getTenant(req.params.id); return t ? ok(res, { tenant: t }) : fail(res, new Error('not found'), 404); } catch (e) { fail(res, e); } });
router.post('/:id/suspend', platformGuard, async (req, res) => { try { ok(res, { tenant: await tenants.suspend(req.params.id, (req.body || {}).reason) }); } catch (e) { fail(res, e); } });
router.post('/:id/resume', platformGuard, async (req, res) => { try { ok(res, { tenant: await tenants.resume(req.params.id) }); } catch (e) { fail(res, e); } });
router.post('/:id/plan', platformGuard, async (req, res) => { try { ok(res, { tenant: await tenants.setPlan(req.params.id, (req.body || {}).planId) }); } catch (e) { fail(res, e); } });

module.exports = router;
