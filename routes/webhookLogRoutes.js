'use strict';
/**
 * routes/webhookLogRoutes.js - inspect + replay outbound webhook deliveries.
 * Mounted at /api/webhooks (bootstrap). Tenant-scoped, auth + admin.
 */
const express = require('express');
const log = require('../lib/webhooks/deliveryLog');
let requireAuth = (req, res, next) => next();
let requireRole = () => (req, res, next) => next();
try { const m = require('../middleware/authMiddleware'); requireAuth = m.requireAuth; requireRole = m.requireRole; } catch {}

const router = express.Router();
const tid = (req) => req.tenantId || req.get('x-tenant-id') || 'default';

router.get('/deliveries', requireAuth, requireRole('admin'), async (req, res) => {
  try { const rows = await log.list(tid(req), { status: req.query.status, host: req.query.host, limit: req.query.limit }); res.json({ success: true, deliveries: rows, count: rows.length }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/deliveries/:id/replay', requireAuth, requireRole('admin'), async (req, res) => {
  try { const r = await log.replay(tid(req), req.params.id); return r ? res.json({ success: true, ...r }) : res.status(404).json({ success: false, error: 'delivery not found' }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;
