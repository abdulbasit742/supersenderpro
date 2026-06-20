// routes/featureFlagsRoutes.js — Express router for Feature Flags + Rollout Control + Kill Switch.
// Mounted at /api/feature-flags. All routes dry-run safe: no live risky enable, no PII, no secrets.
const express=require('express');
const router=express.Router();
const F=require('../lib/featureFlags');
const privacy=require('../lib/featureFlags/privacyGuard');

function safe(fn){ return async (req,res)=>{ try{
  const out=await fn(req,res);
  if(out!==undefined&&!res.headersSent){
    if(privacy.hasLeak(out)) return res.status(500).json({ ok:false, error:'response_blocked_pii_leak' });
    res.json(out);
  }
}catch(e){ res.status(500).json({ ok:false, error:e.message||'feature_flags_error' }); } }; }

// Status / dashboard / doctor / report
router.get('/status', safe(()=>({ ok:true, enabled:F.flags.enabled, dryRun:F.flags.dryRun,
  liveWriteEnabled:F.flags.allowLiveWrite, killSwitchWriteEnabled:F.flags.allowKillSwitchWrite,
  requireApproval:F.flags.requireApproval, requireAudit:F.flags.requireAudit })));
router.get('/dashboard', safe(()=>({ ok:true, dashboard:F.dashboard() })));
router.get('/doctor', safe(()=>({ ok:true, doctor:F.doctor() })));
router.post('/report/generate', safe(()=>({ ok:true, report:F.report() })));

// Flags
router.get('/flags', safe((req)=>{ let list=F.registry.all();
  const { category, status, moduleId }=req.query||{};
  if(category) list=list.filter(f=>f.category===category);
  if(status) list=list.filter(f=>f.status===status);
  if(moduleId) list=list.filter(f=>f.moduleId===moduleId);
  return { ok:true, flags:list }; }));
router.post('/flags', safe((req)=>({ ok:true, flag:F.registry.upsert(req.body||{}), mode:F.safetyGuard.writeMode() })));
router.get('/flags/:key', safe((req)=>{ const f=F.registry.get(req.params.key); return f?{ ok:true, flag:f }:{ ok:false, error:'not_found' }; }));
router.put('/flags/:key', safe((req)=>({ ok:true, flag:F.registry.upsert({ ...(req.body||{}), key:req.params.key }), mode:F.safetyGuard.writeMode() })));
router.post('/flags/:key/evaluate', safe((req)=>({ ok:true, decision:F.evaluator.evaluate(req.params.key, req.body||{}) })));
router.post('/flags/:key/enable-preview', safe((req)=>F.rolloutPreview.preview(req.params.key, { toStatus:'enabled_preview', targetMode:(req.body||{}).targetMode||'all' })));
router.post('/flags/:key/disable-preview', safe((req)=>F.rolloutPreview.preview(req.params.key, { toStatus:'disabled', targetMode:'off' })));

// Rollout
router.post('/rollout/plan', safe((req)=>F.rolloutPlanner.plan((req.body||{}).featureKey, req.body||{})));
router.post('/rollout/preview', safe((req)=>F.rolloutPreview.preview((req.body||{}).featureKey, req.body||{})));
router.get('/rollout/history', safe((req)=>({ ok:true, history:F.rolloutHistory.list(Number(req.query.limit)||100) })));

// Kill switch
router.post('/kill-switch/preview', safe((req)=>F.killSwitch.preview((req.body||{}).featureKey, (req.body||{}).reason)));
router.post('/kill-switch/:key/preview', safe((req)=>F.killSwitch.preview(req.params.key, (req.body||{}).reason)));
router.get('/kill-switches', safe(()=>({ ok:true, killSwitches:F.killSwitches.list() })));

// Access
router.post('/access/check', safe((req)=>({ ok:true, decision:F.evaluator.evaluate((req.body||{}).featureKey, req.body||{}) })));
router.post('/access/tenant', safe((req)=>({ ok:true, decision:F.evaluator.evaluate((req.body||{}).featureKey, { ...(req.body||{}), }) })));
router.post('/access/reseller', safe((req)=>({ ok:true, decision:F.evaluator.evaluate((req.body||{}).featureKey, req.body||{}) })));
router.post('/access/plan', safe((req)=>({ ok:true, decision:F.evaluator.evaluate((req.body||{}).featureKey, req.body||{}) })));

// Flow nodes (metadata only)
router.get('/flow-nodes', safe(()=>({ ok:true, ...F.flowNodes.registry() })));

module.exports=router;
