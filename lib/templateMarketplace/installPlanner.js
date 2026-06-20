// lib/templateMarketplace/installPlanner.js — Builds an install plan from a template + available adapters.
'use strict';
const registry=require('./templateRegistry');
const { guardInstall, flags }=require('./safetyGuard');

const ADAPTER_FILES={
  unifiedSetup:'./adapters/businessSetupAdapter', flowStudio:'./adapters/flowStudioAdapter',
  playbookBuilder:'./adapters/playbookAdapter', growthCampaign:'./adapters/growthCampaignAdapter',
  channelAutomation:'./adapters/channelAutomationAdapter', voiceAI:'./adapters/voiceAIAdapter',
  supportHelpdesk:'./adapters/supportHelpdeskAdapter', resellerPortal:'./adapters/resellerPortalAdapter',
  publicSaasFunnel:'./adapters/publicFunnelAdapter', demoSandbox:'./adapters/demoSandboxAdapter',
  kpiCommand:'./adapters/kpiCommandAdapter', complianceCenter:'./adapters/complianceAdapter',
  ownerCommand:'./adapters/ownerCommandAdapter',
};
function adapterFor(mod){ const f=ADAPTER_FILES[mod]; if(!f) return null; try{ return require(f); }catch(_e){ return null; } }

function plan(templateId, opts={}){
  const tpl=registry.get(templateId);
  if(!tpl) return { ok:false, error:'unknown_template', templateId };
  const guard=guardInstall('blueprint_install');
  const modulesAvailable=[]; const modulesMissing=[]; const actionsPlanned=[]; const warnings=[];
  (tpl.modulesUsed||[]).forEach(mod=>{
    const a=adapterFor(mod);
    if(a&&a.available){ modulesAvailable.push(mod); const p=a.previewPlan(tpl); actionsPlanned.push(...(p.actionsPlanned||[])); }
    else { modulesMissing.push(mod); warnings.push(`module '${mod}' not detected — its setup steps will be skipped`); }
  });
  const blockers=[];
  if(!guard.allowed&&opts.requireLive) blockers.push('live install disabled (TEMPLATE_MARKETPLACE_ALLOW_INSTALL/ALLOW_LIVE_ACTIONS=false)');
  return {
    ok:true, templateId:tpl.id, targetBusinessId:opts.targetBusinessId||'demo-business', targetTenantId:opts.targetTenantId||'demo-tenant-001',
    modulesAvailable, modulesMissing, actionsPlanned, dryRun:true, approvalRequired:true, mode:guard.mode,
    blockers, warnings, requiredEnv:[], setupChecklist:tpl.includedOwnerTasks||[],
    nextSteps:['Review plan','Approve install','Run in target (when live install enabled)'],
    plannedAt:new Date().toISOString(),
  };
}
module.exports={ plan, adapterFor, ADAPTER_FILES };
