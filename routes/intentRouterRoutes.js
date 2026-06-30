// routes/intentRouterRoutes.js
// Self-mountable Express router for the AI Intent Router + auto-tagging.
// Mount in server.js with a single line:
//     app.use('/api/intent-router', require('./routes/intentRouterRoutes'));

const express = require('express');
const router = express.Router();
const ir = require('../lib/intentRouter/intentRouter');

// POST /api/intent-router/classify   Body: { text, useAI? }
router.post('/classify', async (req, res) => {
  try {
    const { text, useAI } = req.body || {};
    if (!text) return res.status(400).json({ success: false, error: 'text is required' });
    res.json({ success: true, ...(await ir.classify(text, { useAI: useAI !== false })) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/intent-router/route   Body: { storeId?, text, useAI? }
router.post('/route', async (req, res) => {
  try {
    const { storeId = 'default_store', text, useAI } = req.body || {};
    if (!text) return res.status(400).json({ success: false, error: 'text is required' });
    res.json({ success: true, ...(await ir.route({ storeId, text, useAI: useAI !== false })) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/intent-router/rules?storeId=
router.get('/rules', (req, res) => {
  try { res.json({ success: true, rules: ir.getRules(req.query.storeId || 'default_store') }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// PUT /api/intent-router/rules   Body: { storeId?, routing?, tagMap? }
router.put('/rules', (req, res) => {
  try {
    const { storeId = 'default_store', routing, tagMap } = req.body || {};
    res.json({ success: true, rules: ir.setRules(storeId, { routing, tagMap }) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/intent-router/health
router.get('/health', (req, res) => {
  try { res.json({ success: true, ...ir.health() }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
