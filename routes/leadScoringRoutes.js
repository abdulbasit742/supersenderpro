// routes/leadScoringRoutes.js — CRM #2: lead/customer scoring.
//
// Wire-up (server.js):
//   app.use('/api/crm/scoring', require('./routes/leadScoringRoutes'));
//
// Scoring reads a Customer 360 profile (#1). These routes pull the profile via c360 if available,
// so you can score by customer id directly.

const express = require('express');
const router = express.Router();

let scoring; try { scoring = require('../lib/crm/leadScoringEngine'); } catch { scoring = null; }
let c360;    try { c360 = require('../lib/crm/customer360'); } catch { c360 = null; }

function ensure(res) {
  if (!scoring) { res.status(503).json({ ok: false, error: 'Scoring engine not available' }); return false; }
  return true;
}

// Score a customer by id (pulls their 360 profile first).
router.get('/:id', async (req, res) => {
  if (!ensure(res)) return;
  if (!c360) return res.status(503).json({ ok: false, error: 'Customer 360 not wired' });
  try {
    const profile = await c360.getProfile(req.params.id);
    res.json({ ok: true, customer: req.params.id, ...scoring.scoreProfile(profile) });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// Score a profile passed in the body (no storage needed). Body: { profile: {...} }
router.post('/score', (req, res) => {
  if (!ensure(res)) return;
  try {
    res.json({ ok: true, ...scoring.scoreProfile((req.body || {}).profile) });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// Ranked worklist from a set of customer ids (hottest first). Body: { keys: [...] }
router.post('/worklist', async (req, res) => {
  if (!ensure(res)) return;
  if (!c360) return res.status(503).json({ ok: false, error: 'Customer 360 not wired' });
  try {
    const profiles = await c360.getProfiles((req.body || {}).keys || []);
    res.json({ ok: true, worklist: scoring.rankProfiles(profiles) });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

module.exports = router;
