const express = require('express');
const router = express.Router();

const profileManager = require('../lib/businessSetup/profileManager');
const registry = require('../lib/businessSetup/presetRegistry');
const applier = require('../lib/businessSetup/presetApplier');
const checklist = require('../lib/businessSetup/setupChecklist');
const readiness = require('../lib/businessSetup/readinessScoring');
const safety = require('../lib/businessSetup/safetyGuard');
const store = require('../lib/businessSetup/store');

const ok = (res, data) => res.json(Object.assign({ ok: true }, data));
const bad = (res, code, errors) => res.status(code).json({ ok: false, errors });

router.get('/status', (req, res) => {
  const profile = profileManager.get();
  const r = readiness.get();
  ok(res, {
      enabled: String(process.env.BUSINESS_SETUP_ENABLED || 'true') === 'true',
      dryRun: safety.globalDryRun(),
      requireApproval: safety.requireApproval(),
      hasProfile: !!profile,
      businessType: profile ? profile.businessType : null,
      selectedPreset: profile ? profile.selectedPreset : null,
      readiness: r ? { score: r.score, band: r.band } : null,
      businessTypes: profileManager.BUSINESS_TYPES,
  });
});

// presets
router.get('/presets', (req, res) => ok(res, { presets: registry.list() }));
router.get('/presets/:id', (req, res) => {
  const p = registry.get(req.params.id);
  return p ? ok(res, { preset: p, recommendations: registry.recommendationsFor(p.id) }) : bad(res, 404, ['not_found']);
});

// profile
router.get('/profile', (req, res) => {
  const p = profileManager.get();
  return p ? ok(res, { profile: store.maskDeep(p) }) : bad(res, 404, ['no_profile']);
});
router.post('/profile', (req, res) => {

 const r = profileManager.create(req.body || {});
 return r.ok ? ok(res, { profile: store.maskDeep(r.profile) }) : bad(res, 400, r.errors);
});
router.put('/profile', (req, res) => {
 const r = profileManager.update(req.body || {});
 return r.ok ? ok(res, { profile: store.maskDeep(r.profile) }) : bad(res, 400, r.errors);
});

// apply preset (dry-run)
router.post('/apply-preset', (req, res) => {
 const result = applier.apply(req.body || {});
 ok(res, { result });
});

// checklist
router.get('/checklist', (req, res) => ok(res, { checklist: checklist.list() }));
router.post('/checklist/:id/mark', (req, res) => {
 const r = checklist.mark(req.params.id, (req.body && req.body.status) || 'configured');
 return r.ok ? ok(res, { item: r.item }) : bad(res, 400, r.errors);
});

// readiness
router.post('/readiness/run', (req, res) => ok(res, { readiness: readiness.run() }));
router.get('/readiness', (req, res) => {
 const r = readiness.get();
 return r ? ok(res, { readiness: r }) : bad(res, 404, ['not_run']);
});

// export / import (local only, masked)
router.post('/export', (req, res) => {
 ok(res, {
     export: {
       profile: store.maskDeep(profileManager.get()),
       checklist: checklist.list(),
       readiness: readiness.get(),
       exportedAt: new Date().toISOString(),
     },
 });
});
router.post('/import', (req, res) => {
 // preview only: never overwrites live config unless preset write enabled
 const incoming = (req.body && req.body.config) || {};
 ok(res, {
     preview: store.maskDeep(incoming),
     applied: false,
   note: 'Import is preview-only. Enable BUSINESS_SETUP_ALLOW_PRESET_WRITE to persist.',
 });
});

router.get('/history', (req, res) => ok(res, { history: store.readHistory(Number(req.query.limit) || 200) }));


module.exports = router;
