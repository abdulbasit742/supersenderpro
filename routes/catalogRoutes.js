// routes/catalogRoutes.js — Commerce #1: product catalog.
//
// Wire-up (server.js):
//   app.use('/api/catalog', require('./routes/catalogRoutes'));

const express = require('express');
const router = express.Router();

let cat;
try { cat = require('../lib/commerce/catalog'); } catch { cat = null; }

function ensure(res) {
  if (!cat) { res.status(503).json({ ok: false, error: 'Catalog not available' }); return false; }
  return true;
}

// List/search. Query: ?tenantId=&category=&status=&search=
router.get('/', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, products: cat.listProducts(req.query) });
});

// Low stock. Query: ?tenantId=
router.get('/low-stock', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, products: cat.lowStock(req.query.tenantId) });
});

// Create. Body: { name, price, stock?, category?, sku?, images?, tenantId? }
router.post('/', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, product: cat.createProduct(req.body || {}) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

router.get('/:id', (req, res) => {
  if (!ensure(res)) return;
  const p = cat.getProduct(req.params.id);
  if (!p) return res.status(404).json({ ok: false, error: 'Product not found' });
  res.json({ ok: true, product: p });
});

router.put('/:id', (req, res) => {
  if (!ensure(res)) return;
  const p = cat.updateProduct(req.params.id, req.body || {});
  if (!p) return res.status(404).json({ ok: false, error: 'Product not found' });
  res.json({ ok: true, product: p });
});

module.exports = router;
