// routes/broadcastAnalyzerRoutes.js
// Self-mountable Express router for the AI broadcast analyzer.
// Mount in server.js with a single line:
//     app.use('/api/broadcast-analyzer', require('./routes/broadcastAnalyzerRoutes'));

const express = require('express');
const router = express.Router();
const ba = require('../lib/broadcastAnalyzer/broadcastAnalyzer');

// POST /api/broadcast-analyzer/analyze
// Body: { storeId?, name?, metrics:{sent,delivered,read,replied,converted,optOuts}, messageText?, save? }
router.post('/analyze', async (req, res) => {
  try {
    const { storeId = 'default_store', name, metrics, messageText, save } = req.body || {};
    if (!metrics) return res.status(400).json({ success: false, error: 'metrics is required' });
    res.json({ success: true, ...(await ba.analyze({ storeId, name, metrics, messageText, save: save !== false })) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/broadcast-analyzer/history?storeId=&limit=
router.get('/history', (req, res) => {
  try {
    const { storeId = 'default_store', limit } = req.query;
    res.json({ success: true, history: ba.history({ storeId, limit: limit ? parseInt(limit, 10) : 30 }) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/broadcast-analyzer/compare?storeId=&limit=
router.get('/compare', (req, res) => {
  try {
    const { storeId = 'default_store', limit } = req.query;
    res.json({ success: true, ...ba.compare({ storeId, limit: limit ? parseInt(limit, 10) : 10 }) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/broadcast-analyzer/health
router.get('/health', (req, res) => {
  try { res.json({ success: true, ...ba.health() }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
