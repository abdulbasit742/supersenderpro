// routes/referralRoutes.js
// Self-mountable Express router for the AI referral program engine.
// Mount in server.js with a single line:
//     app.use('/api/referral', require('./routes/referralRoutes'));

const express = require('express');
const router = express.Router();
const ref = require('../lib/referral/referralEngine');

// POST /api/referral/code   Body: { storeId?, advocate }
router.post('/code', (req, res) => {
  try {
    const { storeId = 'default_store', advocate } = req.body || {};
    if (!advocate) return res.status(400).json({ success: false, error: 'advocate is required' });
    res.json({ success: true, ...ref.getOrCreateCode({ storeId, advocate }) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/referral/share?storeId=&advocate=   (AI-phrased share message)
router.get('/share', async (req, res) => {
  try {
    const { storeId = 'default_store', advocate } = req.query;
    if (!advocate) return res.status(400).json({ success: false, error: 'advocate is required' });
    res.json({ success: true, ...(await ref.shareMessage({ storeId, advocate })) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/referral/attribute   Body: { storeId?, referee, code }
router.post('/attribute', (req, res) => {
  try {
    const { storeId = 'default_store', referee, code } = req.body || {};
    if (!referee || !code) return res.status(400).json({ success: false, error: 'referee and code are required' });
    const r = ref.attribute({ storeId, referee, code });
    res.status(r.ok ? 200 : 400).json({ success: r.ok, ...r });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/referral/qualify   Body: { storeId?, referee, event? }
router.post('/qualify', (req, res) => {
  try {
    const { storeId = 'default_store', referee, event } = req.body || {};
    if (!referee) return res.status(400).json({ success: false, error: 'referee is required' });
    const r = ref.qualify({ storeId, referee, event });
    res.status(r.ok ? 200 : 400).json({ success: r.ok, ...r });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/referral/stats?storeId=&advocate=
router.get('/stats', (req, res) => {
  try {
    const { storeId = 'default_store', advocate } = req.query;
    res.json({ success: true, ...ref.stats({ storeId, advocate }) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/referral/leaderboard?storeId=&limit=
router.get('/leaderboard', (req, res) => {
  try {
    const { storeId = 'default_store', limit } = req.query;
    res.json({ success: true, leaderboard: ref.leaderboard({ storeId, limit: limit ? parseInt(limit, 10) : 20 }) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET/PUT /api/referral/config
router.get('/config', (req, res) => {
  try { res.json({ success: true, config: ref.getConfig(req.query.storeId || 'default_store') }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
router.put('/config', (req, res) => {
  try { const { storeId = 'default_store', ...updates } = req.body || {}; res.json({ success: true, config: ref.setConfig(storeId, updates) }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/referral/health
router.get('/health', (req, res) => {
  try { res.json({ success: true, ...ref.health() }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
