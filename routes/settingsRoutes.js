'use strict';
/**
 * routes/settingsRoutes.js - per-tenant settings. Mounted at /api/settings (bootstrap).
 * GET requires auth (any role); PUT requires admin. Tenant-scoped.
 */
const express = require('express');
const settings = require('../lib/settings');
let requireAuth = (req, res, next) => next();
let requireRole = () => (req, res, next) => next();
try { const m = require('../middleware/authMiddleware'); requireAuth = m.requireAuth; requireRole = m.requireRole; } catch {}

const router = express.Router();
const tid = (req) => req.tenantId || req.get('x-tenant-id') || 'default';

router.get('/', requireAuth, async (req, res) => {
  try { res.json({ success: true, settings: await settings.getAll(tid(req)), schema: settings.SCHEMA }); }
  catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.put('/', requireAuth, requireRole('admin'), async (req, res) => {
  try { res.json({ success: true, settings: await settings.set(tid(req), req.body || {}) }); }
  catch (e) { res.status(400).json({ success: false, error: e.message }); }
});

router.post('/reset', requireAuth, requireRole('admin'), async (req, res) => {
  try { res.json({ success: true, settings: await settings.reset(tid(req), (req.body || {}).key) }); }
  catch (e) { res.status(400).json({ success: false, error: e.message }); }
});

module.exports = router;
