// routes/winbackRoutes.js
// Self-mountable Express router for AI dormant-customer win-back.
// Mount in server.js with a single line:
//     app.use('/api/winback', require('./routes/winbackRoutes'));

const express = require('express');
const router = express.Router();
const wb = require('../lib/winback/winback');

// GET /api/winback/dormant?storeId=&dormantDays=
router.get('/dormant', (req, res) => {
  try {
    const { storeId = 'default_store', dormantDays } = req.query;
    const dormant = wb.findDormant({ storeId, dormantDays: dormantDays ? parseInt(dormantDays, 10) : undefined });
    res.json({ success: true, count: dormant.length, segments: wb.segmentCounts(dormant), dormant });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/winback/draft   Body: { segment, incentive? }
router.post('/draft', async (req, res) => {
  try {
    const { segment = 'general', incentive = '' } = req.body || {};
    res.json({ success: true, segment, ...(await wb.craftMessage({ segment, incentive })) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/winback/launch   Body: { storeId?, dormantDays?, max?, incentiveBySegment? }
router.post('/launch', async (req, res) => {
  try {
    const { storeId = 'default_store', dormantDays, max, incentiveBySegment } = req.body || {};
    res.json({ success: true, ...(await wb.launch({ storeId, dormantDays, max, incentiveBySegment: incentiveBySegment || {} })) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/winback/won        Body: { storeId?, phone }
router.post('/won', (req, res) => {
  try { const { storeId = 'default_store', phone } = req.body || {}; if (!phone) return res.status(400).json({ success: false, error: 'phone is required' }); res.json({ success: true, ...wb.markWon({ storeId, phone }) }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/winback/suppress   Body: { storeId?, phone }
router.post('/suppress', (req, res) => {
  try { const { storeId = 'default_store', phone } = req.body || {}; if (!phone) return res.status(400).json({ success: false, error: 'phone is required' }); res.json({ success: true, ...wb.suppress({ storeId, phone }) }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/winback/sent       Body: { storeId?, phone }
router.post('/sent', (req, res) => {
  try { const { storeId = 'default_store', phone } = req.body || {}; if (!phone) return res.status(400).json({ success: false, error: 'phone is required' }); res.json({ success: true, ...wb.markSent({ storeId, phone }) }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/winback/health
router.get('/health', (req, res) => {
  try { res.json({ success: true, ...wb.health() }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
