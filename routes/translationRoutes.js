// routes/translationRoutes.js
// Self-mountable Express router for real-time chat translation.
// Mount in server.js with a single line:
//     app.use('/api/translation', require('./routes/translationRoutes'));

const express = require('express');
const router = express.Router();
const t = require('../lib/translation/translator');

// POST /api/translation/detect   Body: { text }
router.post('/detect', (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text) return res.status(400).json({ success: false, error: 'text is required' });
    res.json({ success: true, language: t.detectLanguage(text) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/translation/translate   Body: { text, to, from? }
router.post('/translate', async (req, res) => {
  try {
    const { text, to = 'en', from } = req.body || {};
    if (!text) return res.status(400).json({ success: false, error: 'text is required' });
    res.json({ success: true, ...(await t.translate(text, { to, from })) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/translation/inbound   Body: { storeId?, phone, text, agentLang? }
router.post('/inbound', async (req, res) => {
  try {
    const { storeId = 'default_store', phone, text, agentLang } = req.body || {};
    if (!text) return res.status(400).json({ success: false, error: 'text is required' });
    res.json({ success: true, ...(await t.translateInbound({ storeId, phone, text, agentLang })) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/translation/outbound   Body: { storeId?, phone, text, to?, agentLang? }
router.post('/outbound', async (req, res) => {
  try {
    const { storeId = 'default_store', phone, text, to, agentLang } = req.body || {};
    if (!text) return res.status(400).json({ success: false, error: 'text is required' });
    res.json({ success: true, ...(await t.translateOutbound({ storeId, phone, text, to, agentLang })) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/translation/health
router.get('/health', (req, res) => {
  try { res.json({ success: true, ...t.health() }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
