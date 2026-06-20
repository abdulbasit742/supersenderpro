// lib/templateMarketplace/index.js — Barrel for the Template Marketplace + Recipe Store + Blueprint Installer.
// Coordination layer ONLY. Does not rebuild or own any business module.
'use strict';
const { flags }=require('./safetyGuard');
const catalog=require('./templateCatalog');
const registry=require('./templateRegistry');
const recipes=require('./recipeRegistry');
const installer=require('./blueprintInstaller');
const planner=require('./installPlanner');

const ADAPTERS={
  businessSetup:require('./adapters/businessSetupAdapter'), flowStudio:require('./adapters/flowStudioAdapter'),
  playbook:require('./adapters/playbookAdapter'), growthCampaign:require('./adapters/growthCampaignAdapter'),
  channelAutomation:require('./adapters/channelAutomationAdapter'), voiceAI:require('./adapters/voiceAIAdapter'),
  supportHelpdesk:require('./adapters/supportHelpdeskAdapter'), resellerPortal:require('./adapters/resellerPortalAdapter'),
  publicFunnel:require('./adapters/publicFunnelAdapter'), demoSandbox:require('./adapters/demoSandboxAdapter'),
  kpiCommand:require('./adapters/kpiCommandAdapter'), compliance:require('./adapters/complianceAdapter'),
  ownerCommand:require('./adapters/ownerCommandAdapter'), resellerAsset:require('./adapters/resellerAssetAdapter'),
};
function dashboard(){
  const s=catalog.summary();
  return { ...s, recipes:recipes.ids().length, installPreviews:undefined, dryRun:flags.dryRun,
    liveInstallEnabled:flags.allowInstall&&flags.allowLiveActions, publicGallery:flags.publicGallery,
    adapters:Object.fromEntries(Object.entries(ADAPTERS).map(([k,a])=>[k, a.available!==undefined?a.available:(a.resellerAvailable||false)])) };
}
function doctor(){
  const sample=planner.plan('tpl_ai_tools_reseller');
  return { ok:true, enabled:flags.enabled, dryRun:flags.dryRun, allowInstall:flags.allowInstall,
    allowLiveActions:flags.allowLiveActions, requireApproval:flags.requireApproval,
    templates:registry.ids().length, recipes:recipes.ids().length,
    samplePlanOk:sample.ok===true, sampleDryRun:sample.dryRun===true, sampleApprovalRequired:sample.approvalRequired===true,
    liveInstallEnabled:flags.allowInstall&&flags.allowLiveActions, checkedAt:new Date().toISOString() };
}
function report(){
  const d=dashboard();
  return { ok:true, generatedAt:new Date().toISOString(), summary:d,
    templates:registry.all().map(t=>({ id:t.id, title:t.title, industry:t.industry, visibility:t.visibility, status:t.status })),
    recipes:recipes.all().map(r=>({ id:r.id, title:r.title, riskLevel:r.riskLevel, approvalRequired:r.approvalRequired })) };
}
module.exports={
  flags, config:require('./config'), store:require('./store'),
  privacyGuard:require('./privacyGuard'), safetyGuard:require('./safetyGuard'),
  registry, catalog, validator:require('./templateValidator'),
  recipes, recipeBuilder:require('./recipeBuilder'), recipePreview:require('./recipePreview'),
  installer, planner, installPreview:require('./installPreview'), installHistory:require('./installHistory'),
  draftGenerator:require('./templateDraftGenerator'), importExport:require('./templateImportExport'),
  packValidator:require('./templatePackValidator'),
  adapters:ADAPTERS, dashboard, doctor, report,
};
