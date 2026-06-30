// routes/onboardingRoutes.js — Onboarding #1: guided setup wizard.
//
// Wire-up (server.js) — optionally connect verifiers so steps auto-complete:
//   const onb = require('./lib/onboarding/onboarding');
//   onb.setVerifier('first_segment', (t) => require('./lib/marketing/segmentEngine').listSegments(t).length > 0);
//   onb.setVerifier('invite_team',   (t) => require('./lib/team/teamAccess').listMembers(t).length > 1);
//   app.use('/api/onboarding', require('./routes/onboardingRoutes'));

const express = require('express');
const router = express.Router();

let onb;
try { onb = require('../lib/onboarding/onboarding'); } catch { onb = null; }

function ensure(res) {
  if (!onb) { res.status(503).json({ ok: false, error: 'Onboarding not available' }); return false; }
  return true;
}

// Status for a tenant (runs verifiers first so it's always current).
router.get('/:tenantId', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, onboarding: onb.refresh(req.params.tenantId) });
});

// Mark a step done or skipped. Body: { key, status?: 'done'|'skipped' }
router.post('/:tenantId/step', (req, res) => {
  if (!ensure(res)) return;
  const { key, status } = req.body || {};
  const out = onb.markStep(req.params.tenantId, key, status);
  if (!out) return res.status(404).json({ ok: false, error: 'Step not found' });
  res.json({ ok: true, onboarding: out });
});

module.exports = router;
