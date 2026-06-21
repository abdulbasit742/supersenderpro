 'use strict';
 /**
  * routes/demoSandboxRoutes.js
  * Express Router for the Demo Sandbox + Guided Tour Center.
  * Demo-only. No live external calls, no real writes to business modules, no secrets, no full PII.
  * Does not crash if data files are missing.
  */
 const express = require('express');
 const router = express.Router();

 const demoConfig = require('../lib/demoSandbox/demoConfig');
 const guard = require('../lib/demoSandbox/demoModeGuard');
 const dataFactory = require('../lib/demoSandbox/demoDataFactory');
 const scenarioRegistry = require('../lib/demoSandbox/scenarioRegistry');
 const scenarioRunner = require('../lib/demoSandbox/scenarioRunner');
 const tourRegistry = require('../lib/demoSandbox/tourRegistry');
 const tourState = require('../lib/demoSandbox/tourState');
 const demoReset = require('../lib/demoSandbox/demoReset');
 const publicFunnel = require('../lib/demoSandbox/adapters/publicFunnelAdapter');
 const store = require('../lib/demoSandbox/store');

 const ok = (res, data) => res.json(Object.assign({ ok: true }, data));
 const bad = (res, code, errors) => res.status(code).json({ ok: false, errors });

 router.get('/status', (req, res) => {
   const cfg = demoConfig.get();
   const s = store.load();
   ok(res, { enabled: cfg.enabled, dryRun: cfg.dryRun, blockLiveActions: cfg.blockLiveActions, demoTenantId:
 cfg.demoTenantId, activeScenario: s.activeScenario, safety: guard.safetyPanel(), funnelCta: publicFunnel.status() });
 });

 router.get('/config', (req, res) => ok(res, { config: demoConfig.get() }));
 router.post('/config', (req, res) => ok(res, { config: demoConfig.update(req.body || {}) }));

 router.get('/scenarios', (req, res) => ok(res, { scenarios: scenarioRegistry.list() }));
 router.post('/scenarios/:id/start', (req, res) => { const r = scenarioRunner.start(req.params.id); return r.ok ? ok(res,
 r) : bad(res, 404, r.errors); });


 router.post('/reset', (req, res) => ok(res, demoReset.reset(req.body || {})));

 router.get('/data', (req, res) => ok(res, { data: dataFactory.generate((req.query && req.query.scenario) || undefined)
 }));
 router.get('/data/:moduleId', (req, res) => ok(res, { data: dataFactory.forModule(req.params.moduleId, req.query &&
 req.query.scenario) }));

 router.get('/tours', (req, res) => ok(res, { tours: tourRegistry.list() }));
 router.get('/tours/:id', (req, res) => { const t = tourRegistry.get(req.params.id); return t ? ok(res, { tour: t }) :
 bad(res, 404, ['not_found']); });
 router.post('/tours/:id/start', (req, res) => { const r = tourState.start(req.params.id); return r.ok ? ok(res, r) :

bad(res, 404, r.errors); });
router.post('/tours/:id/step', (req, res) => { const r = tourState.advance(req.params.id, (req.body && req.body.stepId));
return r.ok ? ok(res, r) : bad(res, 400, r.errors); });
router.post('/tours/:id/finish', (req, res) => ok(res, tourState.finish(req.params.id)));

router.get('/history', (req, res) => ok(res, { history: store.readHistory(Number(req.query.limit) || 200) }));
router.get('/doctor', (req, res) => ok(res, { safety: guard.safetyPanel(), liveCheck: guard.check('send_whatsapp'),
funnel: publicFunnel.status(), nextSteps: ['Keep demo mode on for client demos', 'Build Public SaaS Funnel to activate funnel CTAs'] }));

module.exports = router;
