'use strict';
/**
 * routes/webhookEndpointRoutes.js - manage outbound webhook endpoints.
 * Mounted at /api/webhooks/endpoints (bootstrap). Auth + admin, tenant-scoped.
 * Secret is returned only on create + rotate.
 */
const express = require('express');
const ep = require('../lib/webhooks/endpoints');
let requireAuth = (req, res, next) => next();
let requireRole = () => (req, res, next) => next();
try { const m = require('../middleware/authMiddleware'); requireAuth = m.requireAuth; requireRole = m.requireRole; } catch {}

const router = express.Router();
const tid = (req) => req.tenantId || req.get('x-tenant-id') || 'default';
const ok = (res, d) => res.json(Object.assign({ success: true }, d));
const fail = (res, e, c = 400) => res.status(c).json({ success: false, error: e && e.message ? e.message : String(e) });

router.get('/', requireAuth, requireRole('admin'), async (req, res) => { try { ok(res, { endpoints: await ep.list(tid(req)) }); } catch (e) { fail(res, e, 500); } });
router.post('/', requireAuth, requireRole('admin'), async (req, res) => { try { ok(res, { endpoint: await ep.create(tid(req), req.body || {}), note: 'Save the secret - shown once.' }); } catch (e) { fail(res, e); } });
router.put('/:id', requireAuth, requireRole('admin'), async (req, res) => { try { const e = await ep.update(tid(req), req.params.id, req.body || {}); return e ? ok(res, { endpoint: e }) : fail(res, new Error('not found'), 404); } catch (e) { fail(res, e); } });
router.post('/:id/rotate-secret', requireAuth, requireRole('admin'), async (req, res) => { try { const e = await ep.rotateSecret(tid(req), req.params.id); return e ? ok(res, { endpoint: e, note: 'Save the secret - shown once.' }) : fail(res, new Error('not found'), 404); } catch (e) { fail(res, e); } });
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => { try { const done = await ep.remove(tid(req), req.params.id); return done ? ok(res, { removed: true }) : fail(res, new Error('not found'), 404); } catch (e) { fail(res, e); } });
router.post('/test', requireAuth, requireRole('admin'), async (req, res) => { try { ok(res, await ep.fanout(tid(req), (req.body || {}).event || 'ping', (req.body || {}).data || { test: true })); } catch (e) { fail(res, e); } });

module.exports = router;
