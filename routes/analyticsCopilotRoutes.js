// routes/analyticsCopilotRoutes.js
// Self-mountable Express router for the natural-language Analytics Copilot.
// Mount in server.js with a single line:
//     app.use('/api/analytics-copilot', require('./routes/analyticsCopilotRoutes'));

const express = require('express');
const router = express.Router();
const copilot = require('../lib/analyticsCopilot/analyticsCopilot');

// POST /api/analytics-copilot/ask   Body: { storeId?, question, useAI? }
router.post('/ask', async (req, res) => {
  try {
    const { storeId = 'default_store', question, useAI } = req.body || {};
    if (!question) return res.status(400).json({ success: false, error: 'question is required' });
    res.json({ success: true, ...(await copilot.ask({ storeId, question, useAI: useAI !== false })) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/analytics-copilot/metrics  (list available metrics)
router.get('/metrics', (req, res) => {
  try { res.json({ success: true, metrics: copilot.listMetrics() }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/analytics-copilot/health
router.get('/health', (req, res) => {
  try { res.json({ success: true, ...copilot.health() }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
