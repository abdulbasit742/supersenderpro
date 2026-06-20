// routes/demoSandboxRoutes.js — Express router for the Demo Sandbox + Guided Product Tour.
// Mounted at /api/demo-sandbox. Demo-only: no live external calls, no real module writes, no secrets, no full PII.
const express = require('express');
const router = express.Router();
const D = require('../lib/demoSandbox');

function safe(fn){ return async (req,res)=>{ try{ const o=await fn(req,res); if(o!==undefined&&!res.headersSent) res.json(o); }catch(e){ res.status(500).json({ok:false,error:e.message||'demo_sandbox_error'}); } }; }

// Status + config
router.get('/status', safe(()=>{ const c=D.config.load(); return { ok:true, enabled:c.enabled, dryRun:c.dryRun,
  blockLiveActions:c.blockLiveActions, showDemoBadges:c.showDemoBadges, scenario:c.scenario,
  demoTenantId:c.demoTenantId, demoBusinessName:c.demoBusinessName, safety:{ allowRealData:c.allowRealData, allowExternalCalls:c.allowExternalCalls } }; }));
router.get('/config', safe(()=>({ ok:true, config:D.config.load() })));
router.post('/config', safe((req)=>({ ok:true, config:D.config.update(req.body||{}) })));

// Scenarios
router.get('/scenarios', safe(()=>({ ok:true, scenarios:D.scenarioRegistry.all() })));
router.post('/scenarios/:id/start', safe((req)=>D.scenarioRunner.start(req.params.id)));

// Reset + data
router.post('/reset', safe((req)=>D.reset.reset((req.body||{}).scenario)));
router.get('/data', safe(()=>{ const s=D.reset.getState(); return { ok:true, demo:true, data:s.data || D.factory.generateAll() }; }));
router.get('/data/:moduleId', safe((req)=>D.factory.generateModule(req.params.moduleId)));

// Tours
router.get('/tours', safe(()=>({ ok:true, tours:D.tourRegistry.all() })));
router.get('/tours/:id', safe((req)=>{ const t=D.tourRegistry.get(req.params.id); return t?{ ok:true, tour:t }:{ ok:false, error:'unknown_tour' }; }));
router.post('/tours/:id/start', safe((req)=>D.tourState.start(req.params.id)));
router.post('/tours/:id/step', safe((req)=>D.tourState.step(req.params.id, (req.body||{}).direction||'next')));
router.post('/tours/:id/finish', safe((req)=>D.tourState.finish(req.params.id)));

// History + doctor
router.get('/history', safe(()=>{ const { readJSON }=require('../lib/demoSandbox/store'); const { paths }=D.config;
  return { ok:true, demo:true, history: readJSON(paths.history, []).slice(0,100) }; }));
router.get('/doctor', safe(()=>({ ok:true, doctor:D.doctor() })));

module.exports = router;
