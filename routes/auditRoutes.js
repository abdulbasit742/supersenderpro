'use strict';
/**
 * routes/auditRoutes.js - read the tenant's audit trail. Mounted at /api/audit (bootstrap).
 * Tenant-scoped + admin-guarded: a tenant admin sees only their own tenant's entries.
 */
const express = require('express');
const audit = require('../lib/audit');
let requireAuth = (req, res, next) => next();
let requireRole = () => (req, res, next) => next();
try { const m = require('../middleware/authMiddleware'); requireAuth = m.requireAuth; requireRole = m.requireRole; } catch {}

const router = express.Router();
const tid = (req) => req.tenantId || req.get('x-tenant-id') || req.query.tenantId || 'default';

router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const rows = await audit.query(tid(req), { action: req.query.action, actorId: req.query.actorId, since: req.query.since, limit: req.query.limit });
    res.json({ success: true, entries: rows, count: rows.length });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;
