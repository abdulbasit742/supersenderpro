// routes/crmProfileSummaryRoutes.js — CRM #4: AI profile summary.
//
// Wire-up (server.js):
//   app.use('/api/crm/summary', require('./routes/crmProfileSummaryRoutes'));
//
// GET /api/crm/summary/:phone -> { summary, nextAction, source: 'ai'|'rules' }
// Routes through the local LLM (Ollama) via ai/aiBrain; falls back to a rules summary if offline.

const express = require('express');
const router = express.Router();

let ps;
try { ps = require('../lib/crm/profileSummary'); } catch { ps = null; }

router.get('/:phone', async (req, res) => {
  if (!ps) return res.status(503).json({ ok: false, error: 'Profile summary not available' });
  try {
    const result = await ps.summariseProfile(req.params.phone);
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
