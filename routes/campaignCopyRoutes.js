// routes/campaignCopyRoutes.js
// Self-mountable Express router for the AI Campaign Copywriter.
// Mount in server.js with a single line:
//     app.use('/api/campaign-copy', require('./routes/campaignCopyRoutes'));

const express = require('express');
const router = express.Router();
const copy = require('../lib/campaignCopy/campaignCopy');

// POST /api/campaign-copy/generate
// Body: { brief, offer?, cta?, tone?, language?, variants?, audience? }
router.post('/generate', async (req, res) => {
  try {
    const result = await copy.generate(req.body || {});
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/campaign-copy/lint   Body: { text }
router.post('/lint', (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text) return res.status(400).json({ success: false, error: 'text is required' });
    res.json({ success: true, ...copy.lint(text) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/campaign-copy/health
router.get('/health', (req, res) => {
  try { res.json({ success: true, ...copy.health() }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
