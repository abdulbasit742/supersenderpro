// routes/loyaltyRoutes.js
// Self-mountable Express router for the AI loyalty & rewards engine.
// Mount in server.js with a single line:
//     app.use('/api/loyalty', require('./routes/loyaltyRoutes'));

const express = require('express');
const router = express.Router();
const loyalty = require('../lib/loyalty/loyaltyEngine');

// POST /api/loyalty/earn   Body: { storeId?, phone, spend? , points?, reason? }
router.post('/earn', (req, res) => {
  try {
    const { storeId = 'default_store', phone, spend, points, reason } = req.body || {};
    if (!phone) return res.status(400).json({ success: false, error: 'phone is required' });
    res.json({ success: true, ...loyalty.earn({ storeId, phone, spend, points, reason }) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/loyalty/redeem   Body: { storeId?, phone, points?, rewardId? }
router.post('/redeem', (req, res) => {
  try {
    const { storeId = 'default_store', phone, points, rewardId } = req.body || {};
    if (!phone) return res.status(400).json({ success: false, error: 'phone is required' });
    const r = loyalty.redeem({ storeId, phone, points, rewardId });
    res.status(r.ok ? 200 : 400).json({ success: r.ok, ...r });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/loyalty/balance?storeId=&phone=
router.get('/balance', (req, res) => {
  try {
    const { storeId = 'default_store', phone } = req.query;
    if (!phone) return res.status(400).json({ success: false, error: 'phone is required' });
    res.json({ success: true, ...loyalty.balance({ storeId, phone }) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/loyalty/nudge?storeId=&phone=
router.get('/nudge', async (req, res) => {
  try {
    const { storeId = 'default_store', phone } = req.query;
    if (!phone) return res.status(400).json({ success: false, error: 'phone is required' });
    res.json({ success: true, ...(await loyalty.nudge({ storeId, phone })) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/loyalty/leaderboard?storeId=&limit=
router.get('/leaderboard', (req, res) => {
  try {
    const { storeId = 'default_store', limit } = req.query;
    res.json({ success: true, leaderboard: loyalty.leaderboard({ storeId, limit: limit ? parseInt(limit, 10) : 20 }) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET/PUT /api/loyalty/config
router.get('/config', (req, res) => {
  try { res.json({ success: true, config: loyalty.getConfig(req.query.storeId || 'default_store') }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
router.put('/config', (req, res) => {
  try { const { storeId = 'default_store', ...updates } = req.body || {}; res.json({ success: true, config: loyalty.setConfig(storeId, updates) }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/loyalty/health
router.get('/health', (req, res) => {
  try { res.json({ success: true, ...loyalty.health() }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
