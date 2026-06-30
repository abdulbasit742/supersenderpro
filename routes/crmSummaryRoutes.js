// routes/crmSummaryRoutes.js — CRM #4: AI profile summary.
//
// Wire-up (server.js):
//   const summary = require('./lib/crm/profileSummary');
//   summary.setAiBrain((prompt) => require('./ai/aiBrain').processPrompt(prompt)); // local Ollama via llmHub
//   app.use('/api/crm/summary', require('./routes/crmSummaryRoutes'));

const express = require('express');
const router = express.Router();

let summary, c360;
try { summary = require('../lib/crm/profileSummary'); } catch { summary = null; }
try { c360 = require('../lib/crm/customer360'); } catch { c360 = null; }

// GET /api/crm/summary/:phone  -> { summary, source }
router.get('/:phone', async (req, res) => {
  if (!summary || !c360) return res.status(503).json({ ok: false, error: 'CRM summary not available' });
  const profile = c360.getProfile(req.params.phone);
  if (!profile) return res.status(404).json({ ok: false, error: 'No profile' });
  try {
    const out = await summary.summarize(profile);
    res.json({ ok: true, ...out });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
