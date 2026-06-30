// routes/llmOpsRoutes.js
// Self-mountable Express router for Local LLM Ops.
// Mount in server.js with a single line:
//     app.use('/api/llm-ops', require('./routes/llmOpsRoutes'));

const express = require('express');
const router = express.Router();
const ops = require('../lib/llmOps/llmOps');

// GET /api/llm-ops/status   (Ollama reachability + loaded models)
router.get('/status', async (req, res) => {
  try { res.json({ success: true, ...(await ops.status()) }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/llm-ops/metrics?sinceHours=24
router.get('/metrics', (req, res) => {
  try {
    const sinceHours = req.query.sinceHours ? parseFloat(req.query.sinceHours) : 24;
    res.json({ success: true, ...ops.metrics({ sinceHours }) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/llm-ops/warm   Body: { model? }
router.post('/warm', async (req, res) => {
  try { res.json({ success: true, ...(await ops.keepWarm({ model: (req.body || {}).model })) }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/llm-ops/generate   Body: { prompt, model?, providers? }  (failover-aware)
router.post('/generate', async (req, res) => {
  try {
    const { prompt, model, providers } = req.body || {};
    if (!prompt) return res.status(400).json({ success: false, error: 'prompt is required' });
    res.json({ success: true, ...(await ops.callWithFailover(prompt, { model, providers })) });
  } catch (err) { res.status(503).json({ success: false, error: err.message }); }
});

// GET /api/llm-ops/health
router.get('/health', async (req, res) => {
  try { res.json({ success: true, ...(await ops.health()) }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
