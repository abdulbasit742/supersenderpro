// routes/catalogRoutes.js — Commerce #1: product catalog.
//
// Wire-up (server.js):
//   app.use('/api/catalog', require('./routes/catalogRoutes'));
//
// Share a product in chat:
//   const card = require('./lib/commerce/catalog').toWhatsApp(productId);
//   broadcastHub.sendToAll({ message: card.text, mediaPath: card.imageUrl, targets });

const express = require('express');
const router = express.Router();

let catalog;
try { catalog = require('../lib/commerce/catalog'); } catch { catalog = null; }

function ensure(res) {
  if (!catalog) { res.status(503).json({ ok: false, error: 'Catalog not available' }); return false; }
  return true;
}

// List. Query: ?category=&search=&activeOnly=&lowStock=
router.get('/', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, products: catalog.listProducts({
    category: req.query.category, search: req.query.search,
    activeOnly: req.query.activeOnly === 'true', lowStock: req.query.lowStock === 'true'
  }) });
});

// Create. Body: { name, price, stock?, sku?, category?, imageUrl?, description? }
router.post('/', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, product: catalog.createProduct(req.body || {}) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

router.get('/:id', (req, res) => {
  if (!ensure(res)) return;
  const p = catalog.getProduct(req.params.id);
  if (!p) return res.status(404).json({ ok: false, error: 'Product not found' });
  res.json({ ok: true, product: p });
});

router.put('/:id', (req, res) => {
  if (!ensure(res)) return;
  const p = catalog.updateProduct(req.params.id, req.body || {});
  if (!p) return res.status(404).json({ ok: false, error: 'Product not found' });
  res.json({ ok: true, product: p });
});

router.delete('/:id', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, ...catalog.deleteProduct(req.params.id) });
});

// WhatsApp product card.
router.get('/:id/card', (req, res) => {
  if (!ensure(res)) return;
  const card = catalog.toWhatsApp(req.params.id);
  if (!card) return res.status(404).json({ ok: false, error: 'Product not found' });
  res.json({ ok: true, ...card });
});

module.exports = router;
