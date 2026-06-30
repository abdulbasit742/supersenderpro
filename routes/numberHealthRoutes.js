// routes/numberHealthRoutes.js
// Self-mountable Express router for the WhatsApp number health + ban-risk monitor.
// Mount in server.js with a single line:
//     app.use('/api/number-health', require('./routes/numberHealthRoutes'));

const express = require('express');
const router = express.Router();
const nh = require('../lib/numberHealth/numberHealth');

// POST /api/number-health/register   Body: { storeId?, number, createdAt? }
router.post('/register', (req, res) => {
  try {
    const { storeId = 'default_store', number, createdAt } = req.body || {};
    if (!number) return res.status(400).json({ success: false, error: 'number is required' });
    res.json({ success: true, ...nh.register({ storeId, number, createdAt }) });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// POST /api/number-health/event   Body: { storeId?, number, type, count? }
router.post('/event', (req, res) => {
  try {
    const { storeId = 'default_store', number, type, count } = req.body || {};
    if (!number || !type) return res.status(400).json({ success: false, error: 'number and type are required' });
    res.json({ success: true, ...nh.event({ storeId, number, type, count: count || 1 }) });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// GET /api/number-health/status?storeId=&number=
router.get('/status', async (req, res) => {
  try {
    const { storeId = 'default_store', number } = req.query;
    if (!number) return res.status(400).json({ success: false, error: 'number is required' });
    res.json({ success: true, ...(await nh.status({ storeId, number })) });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// GET /api/number-health/can-send?storeId=&number=&count=
router.get('/can-send', (req, res) => {
  try {
    const { storeId = 'default_store', number, count } = req.query;
    if (!number) return res.status(400).json({ success: false, error: 'number is required' });
    res.json({ success: true, ...nh.canSend({ storeId, number, count: count ? parseInt(count, 10) : 1 }) });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
});

// GET /api/number-health/list?storeId=
router.get('/list', (req, res) => {
  try { res.json({ success: true, numbers: nh.listNumbers({ storeId: req.query.storeId || 'default_store' }) }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET/PUT /api/number-health/config
router.get('/config', (req, res) => {
  try { res.json({ success: true, config: nh.getConfig(req.query.storeId || 'default_store') }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
router.put('/config', (req, res) => {
  try { const { storeId = 'default_store', ...updates } = req.body || {}; res.json({ success: true, config: nh.setConfig(storeId, updates) }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/number-health/health
router.get('/health', (req, res) => {
  try { res.json({ success: true, ...nh.health() }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
