// routes/templateMarketplaceRoutes.js — Express router for the Template Marketplace + Recipe Store + Blueprint Installer.
// Mounted at /api/template-marketplace. All routes dry-run safe: no live install, no external APIs, no secrets/full PII.
const express=require('express');
const router=express.Router();
const M=require('../lib/templateMarketplace');
const privacy=require('../lib/templateMarketplace/privacyGuard');

function safe(fn){ return async (req,res)=>{ try{
  const out=await fn(req,res);
  if(out!==undefined&&!res.headersSent){
    if(privacy.hasLeak(out)) return res.status(500).json({ ok:false, error:'response_blocked_pii_leak' });
    res.json(out);
  }
}catch(e){ res.status(500).json({ ok:false, error:e.message||'template_marketplace_error' }); } }; }

// Status / dashboard / doctor
router.get('/status', safe(()=>({ ok:true, enabled:M.flags.enabled, dryRun:M.flags.dryRun,
  liveInstallEnabled:M.flags.allowInstall&&M.flags.allowLiveActions, requireApproval:M.flags.requireApproval,
  publicGallery:M.flags.publicGallery })));
router.get('/dashboard', safe(()=>({ ok:true, dashboard:M.dashboard() })));
router.get('/doctor', safe(()=>({ ok:true, doctor:M.doctor() })));
router.post('/report/generate', safe(()=>({ ok:true, report:M.report() })));

// Templates
router.get('/templates', safe((req)=>({ ok:true, templates:M.catalog.search(req.query||{}) })));
router.post('/templates', safe((req)=>{ const v=M.validator.validate(req.body||{}); if(!v.ok) return { ok:false, validation:v };
  return { ok:true, template:M.registry.upsert(req.body) }; }));
router.get('/templates/:id', safe((req)=>{ const t=M.registry.get(req.params.id); return t?{ ok:true, template:t }:{ ok:false, error:'not_found' }; }));
router.put('/templates/:id', safe((req)=>({ ok:true, template:M.registry.upsert({ ...(req.body||{}), id:req.params.id }) })));
router.post('/templates/:id/validate', safe((req)=>{ const t=M.registry.get(req.params.id)||req.body; return { ok:true, validation:M.validator.validate(t) }; }));
router.post('/templates/:id/install-preview', safe((req)=>M.installer.installPreview(req.params.id, req.body||{})));

// Recipes
router.get('/recipes', safe(()=>({ ok:true, recipes:M.recipes.all() })));
router.post('/recipes', safe((req)=>({ ok:true, recipe:M.recipes.upsert(M.recipeBuilder.build(req.body||{})) })));
router.get('/recipes/:id', safe((req)=>{ const r=M.recipes.get(req.params.id); return r?{ ok:true, recipe:r }:{ ok:false, error:'not_found' }; }));
router.post('/recipes/:id/preview', safe((req)=>M.recipePreview.preview(req.params.id, req.body||{})));

// Blueprints
router.post('/blueprints/plan', safe((req)=>M.installer.buildPlan((req.body||{}).templateId, req.body||{})));
router.post('/blueprints/install-preview', safe((req)=>M.installer.installPreview((req.body||{}).templateId, req.body||{})));
router.get('/install-history', safe((req)=>({ ok:true, history:M.installHistory.list(Number(req.query.limit)||100) })));

// Drafts (rule-based by default; no external AI unless explicitly enabled)
router.post('/drafts/template', safe((req)=>({ ok:true, draft:M.draftGenerator.templateDraft(req.body||{}) })));
router.post('/drafts/recipe', safe((req)=>({ ok:true, draft:M.draftGenerator.recipeDraft(req.body||{}) })));
router.post('/drafts/playbook', safe((req)=>({ ok:true, draft:M.draftGenerator.playbookDraft(req.body||{}) })));

// Import / export
router.post('/export', safe((req)=>M.importExport.exportPack((req.body||{}).ids)));
router.post('/import-preview', safe((req)=>M.importExport.importPreview(req.body||{})));

// Public gallery (public_safe + demo_only only)
router.get('/public-gallery', safe(()=>({ ok:true, templates:M.catalog.publicGallery() })));
router.get('/reseller-packs', safe(()=>({ ok:true, ...M.adapters.resellerAsset.resellerPacks() })));

module.exports=router;
