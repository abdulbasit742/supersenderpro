// routes/onboardingRoutes.js — Onboarding #1: setup wizard.
//
// Wire-up (server.js) — auto-detect completed steps from real state:
//   const onboarding = require('./lib/onboarding/onboardingWizard');
//   onboarding.setCheckers({
//     connect_whatsapp: () => !!(waClients.get('default')||{}).isReady,
//     create_segment:   () => require('./lib/marketing/segmentEngine').listSegments().length > 0,
//     first_template:   () => require('./lib/templates/templateManager').listTemplates().length > 0,
//   });
//   app.use('/api/onboarding', require('./routes/onboardingRoutes'));

const express = require('express');
const router = express.Router();

let onboarding;
try { onboarding = require('../lib/onboarding/onboardingWizard'); } catch { onboarding = null; }

function ensure(res) {
  if (!onboarding) { res.status(503).json({ ok: false, error: 'Onboarding not available' }); return false; }
  return true;
}

// Status (refreshes auto-checkers first). /api/onboarding/:tenantId
router.get('/:tenantId', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, onboarding: onboarding.refresh(req.params.tenantId) });
});

// Manually mark a step done/undone. Body: { stepKey, done? }
router.post('/:tenantId/step', (req, res) => {
  if (!ensure(res)) return;
  const { stepKey, done } = req.body || {};
  if (!stepKey) return res.status(400).json({ ok: false, error: 'stepKey required' });
  res.json({ ok: true, onboarding: onboarding.markComplete(req.params.tenantId, stepKey, done !== false) });
});

module.exports = router;
