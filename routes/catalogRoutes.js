'use strict';
// #83 Product Catalog & Variants — HTTP routes. Mount: app.use('/api/catalog', require('./routes/catalogRoutes'));
const express = require('express');
const router = express.Router();
const catalog = require('../lib/catalog');

function tenantOf(req) { return (req.headers['x-tenant-id'] || (req.user && req.user.tenantId) || req.query.tenantId || 'default'); }

router.get('/health', (req, res) => res.json(catalog.doctor.check()));

// Search/list
router.get('/', (req, res) => {
  const out = catalog.find(tenantOf(req), {
    q: req.query.q, category: req.query.category, tag: req.query.tag,
    activeOnly: req.query.activeOnly === 'true',
    page: Number(req.query.page) || 1, pageSize: Number(req.query.pageSize) || undefined
  });
  res.json(Object.assign({ ok: true }, out));
});

// Get one
router.get('/:productId', (req, res) => {
  const p = catalog.get(tenantOf(req), req.params.productId);
  if (!p) return res.status(404).json({ ok: false, error: 'not_found' });
  res.json({ ok: true, product: p });
});

// Create
router.post('/', (req, res) => {
  try {
    const out = catalog.create(Object.assign({ tenantId: tenantOf(req) }, req.body || {}));
    res.status(out.ok ? 200 : 400).json(out);
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Update
router.patch('/:productId', (req, res) => {
  const out = catalog.update({ tenantId: tenantOf(req), productId: req.params.productId, patch: req.body || {} });
  res.status(out.ok ? 200 : 400).json(out);
});

// Add variant
router.post('/:productId/variants', (req, res) => {
  const out = catalog.addVariant({ tenantId: tenantOf(req), productId: req.params.productId, variant: req.body || {} });
  res.status(out.ok ? 200 : 400).json(out);
});

// Price lookup
router.get('/:productId/price', (req, res) => {
  const out = catalog.priceOf({ tenantId: tenantOf(req), productId: req.params.productId, variantId: req.query.variantId });
  res.status(out.ok ? 200 : 400).json(out);
});

// Delete
router.delete('/:productId', (req, res) => {
  const out = catalog.remove({ tenantId: tenantOf(req), productId: req.params.productId });
  res.status(out.ok ? 200 : 400).json(out);
});

module.exports = router;
