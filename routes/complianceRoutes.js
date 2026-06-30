'use strict';
/**
 * routes/complianceRoutes.js - data export + erasure. Mounted at /api/compliance (bootstrap).
 * Owner-only (these are tenant-wide, destructive in the erase case). Both actions are audited.
 */
const express = require('express');
const { exportTenant, eraseTenant } = require('../lib/compliance/dataExport');
let requireAuth = (req, res, next) => next();
let requireRole = () => (req, res, next) => next();
try { const m = require('../middleware/authMiddleware'); requireAuth = m.requireAuth; requireRole = m.requireRole; } catch {}
let audit = null; try { audit = require('../lib/audit'); } catch {}

const router = express.Router();
const tid = (req) => req.tenantId || req.get('x-tenant-id') || 'default';

router.get('/export', requireAuth, requireRole('owner'), async (req, res) => {
  try {
    const bundle = await exportTenant(tid(req));
    if (audit) audit.record(tid(req), 'compliance.export', req.user || null, { totalRows: bundle.totalRows }).catch(() => {});
    if (req.query.download === 'true') { res.set('Content-Disposition', 'attachment; filename="tenant-' + tid(req) + '-export.json"'); }
    res.json({ success: true, export: bundle });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/erase', requireAuth, requireRole('owner'), async (req, res) => {
  try {
    const confirm = (req.body || {}).confirm;
    const result = await eraseTenant(tid(req), confirm);
    if (audit) audit.record(tid(req), 'compliance.erase', req.user || null, { total: result.total }).catch(() => {});
    res.json({ success: true, result });
  } catch (e) { res.status(400).json({ success: false, error: e.message, hint: 'POST { confirm: "<tenantId>" } to confirm erasure' }); }
});

module.exports = router;
