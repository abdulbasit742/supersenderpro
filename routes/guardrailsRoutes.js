// routes/guardrailsRoutes.js
// Self-mountable Express router for AI safety guardrails.
// Mount in server.js with a single line:
//     app.use('/api/guardrails', require('./routes/guardrailsRoutes'));

const express = require('express');
const router = express.Router();
const g = require('../lib/guardrails/guardrails');

// POST /api/guardrails/inbound   Body: { text }
router.post('/inbound', (req, res) => {
  try {
    const { text } = req.body || {};
    if (text === undefined) return res.status(400).json({ success: false, error: 'text is required' });
    res.json({ success: true, ...g.guardInbound(text) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/guardrails/outbound   Body: { text, useAI? }
router.post('/outbound', async (req, res) => {
  try {
    const { text, useAI = false } = req.body || {};
    if (text === undefined) return res.status(400).json({ success: false, error: 'text is required' });
    res.json({ success: true, ...(await g.guardOutbound(text, { useAI: useAI === true || useAI === 'true' })) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/guardrails/redact   Body: { text }
router.post('/redact', (req, res) => {
  try {
    const { text } = req.body || {};
    if (text === undefined) return res.status(400).json({ success: false, error: 'text is required' });
    res.json({ success: true, ...g.redactPII(text) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/guardrails/health
router.get('/health', (req, res) => {
  try { res.json({ success: true, ...g.health() }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
