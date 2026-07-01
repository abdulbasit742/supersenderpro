// routes/agentCopilotRoutes.js
// Self-mountable Express router for the human-agent Copilot.
// Mount in server.js with a single line:
//     app.use('/api/agent-copilot', require('./routes/agentCopilotRoutes'));

const express = require('express');
const router = express.Router();
const copilot = require('../lib/agentCopilot/agentCopilot');

// POST /api/agent-copilot/suggest
// Body: { storeId?, phone?, customerMessage?, count? }  (phone OR customerMessage)
router.post('/suggest', async (req, res) => {
  try {
    const { storeId = 'default_store', phone, customerMessage, count = 3 } = req.body || {};
    const result = await copilot.suggestReplies({ storeId, phone, customerMessage, count });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/agent-copilot/summary   Body: { storeId?, phone }
router.post('/summary', async (req, res) => {
  try {
    const { storeId = 'default_store', phone } = req.body || {};
    const result = await copilot.summarizeThread({ storeId, phone });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/agent-copilot/rewrite   Body: { draft, tone? }
router.post('/rewrite', async (req, res) => {
  try {
    const { draft, tone = 'friendly' } = req.body || {};
    const result = await copilot.rewriteTone({ draft, tone });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/agent-copilot/health
router.get('/health', (req, res) => {
  try { res.json({ success: true, ...copilot.health() }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
