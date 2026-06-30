// routes/returnsRoutes.js
// Express router for the Returns & Refunds (RMA) department.
// Mount in server.js with:
//   const returnsRoutes = require('./routes/returnsRoutes');
//   app.use('/api/returns', returnsRoutes);
//
// tenantId is read from req.tenantId (set by existing auth/tenant middleware)
// or falls back to the X-Tenant-Id header for local testing.

'use strict';

const express = require('express');
const returns = require('../lib/returns');

const router = express.Router();

function tenantOf(req) {
  return req.tenantId || req.headers['x-tenant-id'] || null;
}

function wrap(handler) {
  return (req, res) => {
    try {
      const tenantId = tenantOf(req);
      if (!tenantId) return res.status(400).json({ error: 'missing tenant' });
      handler(req, res, tenantId);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  };
}

// List RMAs (optionally filter by status/orderId).
router.get('/', wrap((req, res, tenantId) => {
  const rows = returns.list(tenantId, {
    status: req.query.status,
    orderId: req.query.orderId
  });
  res.json({ returns: rows });
}));

// Get one RMA.
router.get('/:id', wrap((req, res, tenantId) => {
  const rec = returns.get(tenantId, req.params.id);
  if (!rec) return res.status(404).json({ error: 'not found' });
  res.json(rec);
}));

// Create a return request.
router.post('/', wrap((req, res, tenantId) => {
  const rec = returns.createReturn(tenantId, req.body || {});
  res.status(201).json(rec);
}));

// Lifecycle actions.
router.post('/:id/approve', wrap((req, res, tenantId) => {
  res.json(returns.approve(tenantId, req.params.id, req.body || {}));
}));

router.post('/:id/reject', wrap((req, res, tenantId) => {
  res.json(returns.reject(tenantId, req.params.id, req.body || {}));
}));

router.post('/:id/receive', wrap((req, res, tenantId) => {
  res.json(returns.receive(tenantId, req.params.id, req.body || {}));
}));

// Proposes + records a refund (does NOT charge any card).
router.post('/:id/refund', wrap((req, res, tenantId) => {
  res.json(returns.refund(tenantId, req.params.id, req.body || {}));
}));

// Health.
router.get('/_/doctor', wrap((req, res) => {
  res.json(returns.doctor());
}));

module.exports = router;
