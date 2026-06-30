// routes/ownerBriefingRoutes.js  (AI daily briefing)
// Self-mountable Express router for the AI Daily Owner Briefing.
// NOTE: mount under /api/ai-briefing to avoid colliding with any existing
// owner-briefing routes in the monolith:
//     app.use('/api/ai-briefing', require('./routes/ownerBriefingRoutes'));

const express = require('express');
const router = express.Router();
const briefing = require('../lib/ownerBriefing/dailyBriefing');

// POST /api/ai-briefing/generate   Body: { storeId?, sinceHours? }
router.post('/generate', async (req, res) => {
  try {
    const { storeId = 'default_store', sinceHours } = req.body || {};
    res.json({ success: true, ...(await briefing.generate({ storeId, sinceHours: sinceHours || 24 })) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/ai-briefing/latest?storeId=
router.get('/latest', (req, res) => {
  try {
    const rec = briefing.latest({ storeId: req.query.storeId || 'default_store' });
    if (!rec) return res.status(404).json({ success: false, error: 'no briefing yet' });
    res.json({ success: true, briefing: rec });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/ai-briefing/history?storeId=&limit=
router.get('/history', (req, res) => {
  try {
    const { storeId = 'default_store', limit } = req.query;
    res.json({ success: true, history: briefing.history({ storeId, limit: limit ? parseInt(limit, 10) : 30 }) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/ai-briefing/health
router.get('/health', (req, res) => {
  try { res.json({ success: true, ...briefing.health() }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
