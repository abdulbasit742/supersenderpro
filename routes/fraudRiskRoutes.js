// routes/fraudRiskRoutes.js
// Self-mountable Express router for the AI order fraud + COD-risk scorer.
// Mount in server.js with a single line:
//     app.use('/api/fraud-risk', require('./routes/fraudRiskRoutes'));

const express = require('express');
const router = express.Router();
const fraud = require('../lib/fraudRisk/fraudRisk');

// POST /api/fraud-risk/assess   Body: { storeId?, order:{ phone, value?, address?, items?, paymentMethod? } }
router.post('/assess', async (req, res) => {
  try {
    const { storeId = 'default_store', order } = req.body || {};
    if (!order || !order.phone) return res.status(400).json({ success: false, error: 'order.phone is required' });
    res.json({ success: true, ...(await fraud.assess({ storeId, order })) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/fraud-risk/outcome   Body: { storeId?, phone, outcome }
router.post('/outcome', (req, res) => {
  try {
    const { storeId = 'default_store', phone, outcome } = req.body || {};
    if (!phone || !outcome) return res.status(400).json({ success: false, error: 'phone and outcome are required' });
    if (!['delivered', 'returned', 'cancelled'].includes(outcome)) return res.status(400).json({ success: false, error: 'outcome must be delivered|returned|cancelled' });
    res.json({ success: true, ...fraud.recordOutcome({ storeId, phone, outcome }) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/fraud-risk/stats?storeId=
router.get('/stats', (req, res) => {
  try { res.json({ success: true, ...fraud.stats({ storeId: req.query.storeId || 'default_store' }) }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET/PUT /api/fraud-risk/config
router.get('/config', (req, res) => {
  try { res.json({ success: true, config: fraud.getConfig(req.query.storeId || 'default_store') }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
router.put('/config', (req, res) => {
  try { const { storeId = 'default_store', ...updates } = req.body || {}; res.json({ success: true, config: fraud.setConfig(storeId, updates) }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/fraud-risk/health
router.get('/health', (req, res) => {
  try { res.json({ success: true, ...fraud.health() }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
