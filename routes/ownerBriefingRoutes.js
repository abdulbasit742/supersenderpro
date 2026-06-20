// routes/ownerBriefingRoutes.js — Express router for the Owner Briefing & Daily Autopilot.
// Mounted at /api/owner-briefing. Read-only aggregation + dry-run delivery packets only.

const express = require('express');
const router = express.Router();
const O = require('../lib/ownerBriefing');

function safe(fn) {
  return async (req, res) => {
    try {
      const out = await fn(req, res);
      if (out !== undefined && !res.headersSent) res.json(out);
    } catch (e) { res.status(500).json({ ok: false, error: e.message || 'owner_briefing_error' }); }
  };
}

router.get('/status', safe(() => ({
  ok: true, enabled: O.config.enabled, dryRun: O.config.dryRun,
  liveSend: O.config.effective.liveSend, channel: O.config.channel, schedule: O.scheduler.schedule(),
})));

router.get('/kpis', safe(() => ({ ok: true, kpis: O.kpiBuilder.build() })));
router.get('/alerts', safe(() => ({ ok: true, alerts: O.alertRules.evaluate(O.kpiBuilder.build()) })));

// Generate a briefing (morning|evening). Dry-run; stored to history.
router.post('/generate', safe((req) => {
  const kind = ((req.body || {}).kind === 'evening') ? 'evening' : 'morning';
  const briefing = O.briefingBuilder.build(kind);
  O.historyStore.add(briefing);
  return { ok: true, briefing };
}));
router.get('/briefing/:kind', safe((req) => {
  const kind = req.params.kind === 'evening' ? 'evening' : 'morning';
  return { ok: true, briefing: O.briefingBuilder.build(kind) };
}));

// Build a dry-run delivery packet (never sends).
router.post('/deliver', safe((req) => {
  const kind = ((req.body || {}).kind === 'evening') ? 'evening' : 'morning';
  const briefing = O.briefingBuilder.build(kind);
  const packet = O.deliveryAdapter.buildPacket(briefing, { channel: (req.body || {}).channel });
  return { ok: true, packet };
}));

router.get('/schedule', safe(() => ({ ok: true, schedule: O.scheduler.schedule() })));
router.get('/history', safe((req) => ({ ok: true, history: O.historyStore.list({ limit: Number(req.query.limit) || 50 }) })));

module.exports = router;
