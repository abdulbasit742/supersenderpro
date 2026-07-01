// routes/catalogRoutes.js
// Self-mountable Express router for the AI catalog manager.
// Mount in server.js with a single line:
//     app.use('/api/catalog', require('./routes/catalogRoutes'));

const express = require('express');
const router = express.Router();
const cat = require('../lib/catalog/catalogManager');

// POST /api/catalog/enrich   Body: { name?, raw, price? }   (preview only, no store)
router.post('/enrich', async (req, res) => {
  try {
    const { name, raw, price } = req.body || {};
    if (!name && !raw) return res.status(400).json({ success: false, error: 'name or raw is required' });
    res.json({ success: true, entry: await cat.enrich({ name, raw, price }) });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// POST /api/catalog/add   Body: { storeId?, name?, raw, price?, inStock?, syncRag? }
router.post('/add', async (req, res) => {
  try {
    const { storeId = 'default_store', name, raw, price, inStock, syncRag } = req.body || {};
    if (!name && !raw) return res.status(400).json({ success: false, error: 'name or raw is required' });
    res.json({ success: true, ...(await cat.addProduct({ storeId, name, raw, price, inStock, syncRag: syncRag !== false })) });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// POST /api/catalog/bulk   Body: { storeId?, items:[string|{name,raw,price}], syncRag? }
router.post('/bulk', async (req, res) => {
  try {
    const { storeId = 'default_store', items = [], syncRag } = req.body || {};
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ success: false, error: 'items array is required' });
    res.json({ success: true, ...(await cat.bulkAdd({ storeId, items, syncRag: syncRag !== false })) });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// GET /api/catalog/list?storeId=&category=&limit=
router.get('/list', (req, res) => {
  try { const { storeId = 'default_store', category, limit } = req.query; res.json({ success: true, products: cat.listProducts({ storeId, category, limit: limit ? parseInt(limit, 10) : 500 }) }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/catalog/product/:name?storeId=
router.get('/product/:name', (req, res) => {
  const p = cat.getProduct({ storeId: req.query.storeId || 'default_store', name: req.params.name });
  if (!p) return res.status(404).json({ success: false, error: 'not found' });
  res.json({ success: true, product: p });
});

// DELETE /api/catalog/product/:name?storeId=
router.delete('/product/:name', (req, res) => {
  try { res.json({ success: true, ...cat.deleteProduct({ storeId: req.query.storeId || 'default_store', name: req.params.name }) }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/catalog/sync-rag   Body: { storeId? }
router.post('/sync-rag', async (req, res) => {
  try { res.json({ success: true, ...(await cat.syncAllToRAG({ storeId: (req.body || {}).storeId || 'default_store' })) }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/catalog/health
router.get('/health', (req, res) => {
  try { res.json({ success: true, ...cat.health() }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
