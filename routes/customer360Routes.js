// routes/customer360Routes.js
// Self-mountable Express router for AI Customer 360.
// Mount in server.js with a single line:
//     app.use('/api/customer-360', require('./routes/customer360Routes'));

const express = require('express');
const router = express.Router();
const c360 = require('../lib/customer360/customer360');

// GET /api/customer-360/profile/:phone?storeId=&summary=true
router.get('/profile/:phone', async (req, res) => {
  try {
    const storeId = req.query.storeId || 'default_store';
    const withSummary = req.query.summary !== 'false';
    res.json({ success: true, ...(await c360.profile({ storeId, phone: req.params.phone, withSummary })) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/customer-360/raw/:phone?storeId=   (structured profile only, no AI)
router.get('/raw/:phone', (req, res) => {
  try {
    const storeId = req.query.storeId || 'default_store';
    res.json({ success: true, profile: c360.buildProfile({ storeId, phone: req.params.phone }) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/customer-360/search?storeId=&band=&atRisk=&limit=
router.get('/search', (req, res) => {
  try {
    const { storeId = 'default_store', band, atRisk, limit } = req.query;
    res.json({ success: true, results: c360.search({ storeId, band, atRisk: atRisk === 'true', limit: limit ? parseInt(limit, 10) : 50 }) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/customer-360/health
router.get('/health', (req, res) => {
  try { res.json({ success: true, ...c360.health() }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
