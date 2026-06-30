// routes/upsellRoutes.js
// Self-mountable Express router for the AI upsell / cross-sell recommender.
// Mount in server.js with a single line:
//     app.use('/api/upsell', require('./routes/upsellRoutes'));

const express = require('express');
const router = express.Router();
const upsell = require('../lib/upsell/upsellEngine');

// POST /api/upsell/recommend   Body: { storeId?, items:[names|{name}], k? }
router.post('/recommend', async (req, res) => {
  try {
    const { storeId = 'default_store', items = [], k } = req.body || {};
    if (!items || !items.length) return res.status(400).json({ success: false, error: 'items is required' });
    res.json({ success: true, ...(await upsell.recommend({ storeId, items, k: k || 3 })) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/upsell/bundle   Body: { storeId?, items:[], discountPct? }
router.post('/bundle', async (req, res) => {
  try {
    const { storeId = 'default_store', items = [], discountPct } = req.body || {};
    if (!items || !items.length) return res.status(400).json({ success: false, error: 'items is required' });
    res.json({ success: true, ...(await upsell.bundle({ storeId, items, discountPct: discountPct || 5 })) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/upsell/purchase   Body: { storeId?, items:[] }  (record a co-purchase to learn from)
router.post('/purchase', (req, res) => {
  try {
    const { storeId = 'default_store', items = [] } = req.body || {};
    if (!items || !items.length) return res.status(400).json({ success: false, error: 'items is required' });
    res.json({ success: true, ...upsell.recordPurchase({ storeId, items }) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/upsell/stats?storeId=
router.get('/stats', (req, res) => {
  try { res.json({ success: true, ...upsell.stats({ storeId: req.query.storeId || 'default_store' }) }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/upsell/health
router.get('/health', (req, res) => {
  try { res.json({ success: true, ...upsell.health() }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
