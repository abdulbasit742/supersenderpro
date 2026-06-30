'use strict';
/**
 * routes/apiKeyRoutes.js - manage a tenant's API keys. Mounted at /api/api-keys (bootstrap).
 * Managed by a human (JWT auth + admin role). The raw key is returned ONLY on creation.
 */
const express = require('express');
const apiKeys = require('../lib/apiKeys');
let requireAuth = (req, res, next) => next();
let requireRole = () => (req, res, next) => next();
try { const m = require('../middleware/authMiddleware'); requireAuth = m.requireAuth; requireRole = m.requireRole; } catch {}

const router = express.Router();
const tid = (req) => req.tenantId || req.get('x-tenant-id') || 'default';
const ok = (res, d) => res.json(Object.assign({ success: true }, d));
const fail = (res, e, c = 400) => res.status(c).json({ success: false, error: e && e.message ? e.message : String(e) });

router.get('/', requireAuth, requireRole('admin'), async (req, res) => { try { ok(res, { keys: await apiKeys.list(tid(req)) }); } catch (e) { fail(res, e, 500); } });
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  try { const k = await apiKeys.issue(tid(req), req.body || {}); ok(res, { apiKey: k, note: 'Save this key now - it will not be shown again.' }); } catch (e) { fail(res, e); }
});
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => { try { const done = await apiKeys.revoke(tid(req), req.params.id); return done ? ok(res, { revoked: true }) : fail(res, new Error('key not found'), 404); } catch (e) { fail(res, e); } });

module.exports = router;
