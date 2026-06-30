// routes/purchaseOrdersRoutes.js
// REST surface for Purchase Orders & Suppliers (#67).
// Wire in server.js (2 lines):
//   const purchaseOrdersRoutes = require('./routes/purchaseOrdersRoutes');
//   app.use('/api/purchase-orders', purchaseOrdersRoutes);

'use strict';

const express = require('express');
const router = express.Router();
const po = require('../lib/purchaseOrders');
const { maskSupplier } = require('../lib/purchaseOrders/privacy');

function tenantOf(req) {
  return req.tenantId || req.headers['x-tenant-id'] || (req.body && req.body.tenantId);
}
function wrap(fn) {
  return (req, res) => {
    try { return fn(req, res); }
    catch (e) { return res.status(400).json({ ok: false, error: e.message }); }
  };
}

// --- Suppliers ---
router.get('/suppliers', wrap((req, res) => {
  const rows = po.listSuppliers(tenantOf(req)).map(maskSupplier);
  res.json({ ok: true, suppliers: rows });
}));

router.post('/suppliers', wrap((req, res) => {
  const rec = po.createSupplier(tenantOf(req), req.body || {});
  res.status(201).json({ ok: true, supplier: maskSupplier(rec) });
}));

router.patch('/suppliers/:id', wrap((req, res) => {
  const rec = po.updateSupplier(tenantOf(req), req.params.id, req.body || {});
  res.json({ ok: true, supplier: maskSupplier(rec) });
}));

// --- Purchase Orders ---
router.get('/', wrap((req, res) => {
  const rows = po.listPOs(tenantOf(req), { state: req.query.state, supplierId: req.query.supplierId });
  res.json({ ok: true, purchaseOrders: rows });
}));

router.get('/reorder-suggestions', wrap((req, res) => {
  res.json(Object.assign({ ok: true }, po.reorderSuggestions(tenantOf(req))));
}));

router.get('/:id', wrap((req, res) => {
  const rec = po.getPO(tenantOf(req), req.params.id);
  if (!rec) return res.status(404).json({ ok: false, error: 'not found' });
  res.json({ ok: true, purchaseOrder: rec });
}));

router.post('/', wrap((req, res) => {
  const rec = po.createPO(tenantOf(req), req.body || {});
  res.status(201).json({ ok: true, purchaseOrder: rec });
}));

router.post('/:id/order', wrap((req, res) => {
  res.json({ ok: true, purchaseOrder: po.setState(tenantOf(req), req.params.id, 'ordered') });
}));

router.post('/:id/receive', wrap((req, res) => {
  const out = po.receive(tenantOf(req), req.params.id, (req.body && req.body.receipts) || []);
  res.json(Object.assign({ ok: true }, out));
}));

router.post('/:id/cancel', wrap((req, res) => {
  res.json({ ok: true, purchaseOrder: po.cancelPO(tenantOf(req), req.params.id) });
}));

module.exports = router;
