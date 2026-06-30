'use strict';
/**
 * routes/customerCsvRoutes.js - bulk customer import/export. Mounted at /api/customers (bootstrap).
 * Import accepts raw CSV body (text/csv) or { csv } JSON. Auth + admin. Tenant-scoped.
 */
const express = require('express');
const csv = require('../lib/customers/csv');
let requireAuth = (req, res, next) => next();
let requireRole = () => (req, res, next) => next();
try { const m = require('../middleware/authMiddleware'); requireAuth = m.requireAuth; requireRole = m.requireRole; } catch {}

const router = express.Router();
const tid = (req) => req.tenantId || req.get('x-tenant-id') || 'default';

// accept raw text bodies for this router
router.use(express.text({ type: ['text/csv', 'text/plain'], limit: '5mb' }));

router.post('/import', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const csvText = (typeof req.body === 'string' && req.body) || (req.body && req.body.csv) || '';
    if (!csvText) return res.status(400).json({ success: false, error: 'provide CSV (text/csv body or { csv })' });
    const result = await csv.importCustomers(tid(req), csvText);
    res.json({ success: true, ...result });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/export.csv', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const out = await csv.exportCustomers(tid(req));
    res.set('Content-Type', 'text/csv');
    res.set('Content-Disposition', 'attachment; filename="customers-' + tid(req) + '.csv"');
    res.send(out);
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

module.exports = router;
