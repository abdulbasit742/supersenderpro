// routes/unifiedSetupRoutes.js — Express router for the Unified Setup Wizard.
// Mounted at /api/unified-setup. Read/inspect + safe local actions only.
// Never exposes secret values; never calls external APIs by default.

const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const U = require('../lib/unifiedSetup');

function safe(fn) {
  return async (req, res) => {
    try {
      const out = await fn(req, res);
      if (out !== undefined && !res.headersSent) res.json(out);
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message || 'unified_setup_error' });
    }
  };
}

// ---- Status ----
router.get('/status', safe(() => {
  const profile = U.businessProfile.get();
  const readiness = U.readinessReport.build();
  return {
    ok: true,
    enabled: U.config.enabled,
    dryRun: U.config.dryRun,
    autopilotEnabled: U.config.autopilotEnabled,
    hasProfile: !!profile,
    businessType: profile ? profile.businessType : null,
    score: readiness.score,
    readinessStatus: readiness.status,
    blockers: readiness.blockers.length,
  };
}));

// ---- Business profile ----
router.get('/profile', safe(() => ({ ok: true, profile: U.businessProfile.get(), businessTypes: U.presets.BUSINESS_TYPES })));
router.post('/profile', safe((req) => ({ ok: true, profile: U.businessProfile.upsert(req.body || {}) })));
router.put('/profile', safe((req) => ({ ok: true, profile: U.businessProfile.upsert(req.body || {}) })));

// ---- Steps ----
router.get('/steps', safe(() => ({ ok: true, steps: U.stepEngine.allSteps() })));
router.post('/steps/:id/verify', safe((req) => {
  const s = U.stepEngine.verifyStep(req.params.id, (req.body || {}).note || '');
  return s ? { ok: true, step: s } : { ok: false, error: 'step_not_found' };
}));
router.post('/steps/:id/skip', safe((req) => {
  const s = U.stepEngine.skipStep(req.params.id);
  return s ? { ok: true, step: s } : { ok: false, error: 'step_not_found' };
}));

// ---- Scan (re-inspect all modules; local only) ----
router.post('/scan', safe(() => ({ ok: true, modules: U.connectors.allStatuses(), steps: U.stepEngine.allSteps() })));

// ---- Credentials (names + presence only, never values) ----
router.get('/credentials', safe(() => ({ ok: true, checklist: U.credentialChecklist.build(), summary: U.credentialChecklist.summary() })));

// ---- Readiness ----
router.get('/readiness', safe(() => ({ ok: true, readiness: U.readinessReport.build() })));

// ---- Autopilot ----
router.post('/autopilot/plan', safe((req) => {
  const type = (req.body || {}).businessType || (U.businessProfile.get() || {}).businessType || 'custom';
  return { ok: true, plan: U.autopilotPlanner.plan(type) };
}));

// ---- Tasks ----
router.get('/tasks', safe(() => ({ ok: true, tasks: U.onboardingTasks.list() })));
router.post('/tasks/generate', safe(() => ({ ok: true, ...U.onboardingTasks.generate() })));
router.post('/tasks/:id/done', safe((req) => ({ ok: true, task: U.onboardingTasks.markDone(req.params.id) })));
router.post('/tasks/:id/skip', safe((req) => ({ ok: true, task: U.onboardingTasks.skip(req.params.id) })));
router.post('/tasks/:id/snooze', safe((req) => ({ ok: true, task: U.onboardingTasks.snooze(req.params.id, (req.body || {}).days || 3) })));

// ---- Export report (writes to repo-relative export dir; safe, no secrets) ----
router.post('/export-report', safe(() => {
  const report = {
    generatedAt: new Date().toISOString(),
    profile: U.businessProfile.get(),
    readiness: U.readinessReport.build(),
    steps: U.stepEngine.allSteps(),
    credentials: U.credentialChecklist.summary(),
    plan: U.autopilotPlanner.plan((U.businessProfile.get() || {}).businessType || 'custom'),
  };
  const dir = U.config.paths.exportDir;
  try { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); } catch (_e) {}
  const jsonPath = path.join(dir, 'unified_setup_report.json');
  try { fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2)); } catch (_e) {}
  return { ok: true, exportedTo: 'artifacts/unified_setup_report.json', report };
}));

// ---- History ----
router.get('/history', safe(() => {
  const h = U.store.readJSON(U.config.paths.history, { events: [] });
  return { ok: true, history: (h.events || []).slice(-100).reverse() };
}));

module.exports = router;
