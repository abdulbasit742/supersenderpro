// routes/inventoryRoutes.js
// Self-mountable Express router for the AI inventory & restock forecaster.
// Mount in server.js with a single line:
//     app.use('/api/inventory', require('./routes/inventoryRoutes'));

const express = require('express');
const router = express.Router();
const inv = require('../lib/inventory/inventoryForecast');

// POST /api/inventory/stock   Body: { storeId?, product, onHand }
router.post('/stock', (req, res) => {
  try {
    const { storeId = 'default_store', product, onHand } = req.body || {};
    if (!product) return res.status(400).json({ success: false, error: 'product is required' });
    res.json({ success: true, ...inv.setStock({ storeId, product, onHand }) });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// POST /api/inventory/sale   Body: { storeId?, product, qty?, ts? }
router.post('/sale', (req, res) => {
  try {
    const { storeId = 'default_store', product, qty, ts } = req.body || {};
    if (!product) return res.status(400).json({ success: false, error: 'product is required' });
    res.json({ success: true, ...inv.recordSale({ storeId, product, qty: qty || 1, ts: ts || Date.now() }) });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// GET /api/inventory/forecast?storeId=&product=
router.get('/forecast', (req, res) => {
  try {
    const { storeId = 'default_store', product } = req.query;
    if (!product) return res.status(400).json({ success: false, error: 'product is required' });
    res.json({ success: true, ...inv.forecast({ storeId, product }) });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// GET /api/inventory/alerts?storeId=&all=
router.get('/alerts', (req, res) => {
  try {
    const { storeId = 'default_store', all } = req.query;
    res.json({ success: true, items: inv.forecastAll({ storeId, onlyAlerts: all !== 'true' }) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/inventory/in-stock?storeId=&product=&qty=
router.get('/in-stock', (req, res) => {
  try {
    const { storeId = 'default_store', product, qty } = req.query;
    if (!product) return res.status(400).json({ success: false, error: 'product is required' });
    res.json({ success: true, ...inv.inStock({ storeId, product, qty: qty ? parseInt(qty, 10) : 1 }) });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// GET/PUT /api/inventory/config
router.get('/config', (req, res) => {
  try { res.json({ success: true, config: inv.getConfig(req.query.storeId || 'default_store') }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
router.put('/config', (req, res) => {
  try { const { storeId = 'default_store', ...updates } = req.body || {}; res.json({ success: true, config: inv.setConfig(storeId, updates) }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/inventory/health
router.get('/health', (req, res) => {
  try { res.json({ success: true, ...inv.health() }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
