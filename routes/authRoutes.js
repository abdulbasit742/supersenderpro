'use strict';
/**
 * routes/authRoutes.js - Phase 2 auth API. Mounted at /api/auth (see AUTH HOOK).
 * Wire: node scripts/wire-auth.js
 *
 * tenantId resolution: body/query/header x-tenant-id, default 'default'.
 * (Once a public signup funnel assigns tenants, swap this for the funnel's resolver.)
 */
const express = require('express');
const auth = require('../lib/auth');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();
const ok = (res, d) => res.json(Object.assign({ success: true }, d));
const fail = (res, e, c = 400) => res.status(c).json({ success: false, error: e && e.message ? e.message : String(e) });
const tid = (req) => req.get('x-tenant-id') || (req.body && req.body.tenantId) || req.query.tenantId || 'default';

router.post('/signup', async (req, res) => { try { ok(res, await auth.signup(tid(req), req.body || {})); } catch (e) { fail(res, e); } });
router.post('/login', async (req, res) => { try { ok(res, await auth.login(tid(req), req.body || {})); } catch (e) { fail(res, e, 401); } });
router.get('/me', requireAuth, (req, res) => ok(res, { user: req.user }));

router.post('/password/reset-request', async (req, res) => {
  try {
    const r = await auth.requestPasswordReset(tid(req), (req.body || {}).email);
    // NOTE: deliver r.resetToken to the user via WhatsApp/email; never returned in prod responses.
    const expose = process.env.AUTH_EXPOSE_RESET_TOKEN === 'true';
    ok(res, expose ? r : { ok: true });
  } catch (e) { fail(res, e); }
});
router.post('/password/reset', async (req, res) => { try { ok(res, await auth.resetPassword(tid(req), req.body || {})); } catch (e) { fail(res, e); } });

/* ---- user management (RBAC: admin+) ---- */
router.get('/users', requireAuth, requireRole('admin'), async (req, res) => { try { ok(res, { users: await auth.listUsers(req.tenantId) }); } catch (e) { fail(res, e, 500); } });
router.post('/users/:id/role', requireAuth, requireRole('owner'), async (req, res) => { try { ok(res, { user: await auth.setRole(req.tenantId, req.params.id, (req.body || {}).role) }); } catch (e) { fail(res, e); } });
router.post('/users/:id/status', requireAuth, requireRole('admin'), async (req, res) => { try { ok(res, { user: await auth.setStatus(req.tenantId, req.params.id, (req.body || {}).status) }); } catch (e) { fail(res, e); } });

module.exports = router;
