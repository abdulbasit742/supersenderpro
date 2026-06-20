// lib/featureFlags/index.js — Barrel for the Feature Flags + Rollout Control + Kill Switch Command Center.
// Coordination layer ONLY. Does not rebuild config/auth/RBAC/billing or any business module.
'use strict';
const { flags }=require('./safetyGuard');
const registry=require('./featureRegistry');
const evaluator=require('./flagEvaluator');
const rolloutPlanner=require('./rolloutPlanner');
const rolloutPreview=require('./rolloutPreview');
const rolloutHistory=require('./rolloutHistory');
const killSwitch=require('./emergencyKillSwitch');
const killSwitches=require('./killSwitches');

const ADAPTERS={
  saasBilling:require('./adapters/saasBillingAdapter'), tenantPortal:require('./adapters/tenantPortalAdapter'),
  resellerPortal:require('./adapters/resellerPortalAdapter'), pilotOps:require('./adapters/pilotOpsAdapter'),
  securityGateway:require('./adapters/securityGatewayAdapter'), approvalInbox:require('./adapters/approvalInboxAdapter'),
  auditLedger:require('./adapters/auditLedgerAdapter'), compliance:require('./adapters/complianceAdapter'),
  incidentCommand:require('./adapters/incidentCommandAdapter'), deploymentCommand:require('./adapters/deploymentCommandAdapter'),
  ownerCommand:require('./adapters/ownerCommandAdapter'), kpiCommand:require('./adapters/kpiCommandAdapter'),
  publicFunnel:require('./adapters/publicFunnelAdapter'), developerPortal:require('./adapters/developerPortalAdapter'),
  templateMarketplace:require('./adapters/templateMarketplaceAdapter'), supportHelpdesk:require('./adapters/supportHelpdeskAdapter'),
};
function dashboard(){
  const a=registry.all();
  const by=(p)=>a.filter(p).length;
  return { totalFlags:a.length, enabledPreview:by(f=>f.status==='enabled_preview'), enabled:by(f=>f.status==='enabled'),
    disabled:by(f=>f.status==='disabled'), beta:by(f=>f.status==='beta'||f.betaGroup), killed:by(f=>f.status==='killed'),
    highRisk:by(f=>['high','critical'].includes(f.riskLevel)), pendingApproval:by(f=>f.requiresApproval&&f.status!=='enabled'),
    dryRun:flags.dryRun, liveWriteEnabled:flags.allowLiveWrite, killSwitchWriteEnabled:flags.allowKillSwitchWrite,
    adapters:Object.fromEntries(Object.entries(ADAPTERS).map(([k,ad])=>[k, ad.available===true])) };
}
function doctor(){
  const sampleEval=evaluator.evaluate('customer_360',{ userRole:'admin', planId:'business' });
  const sampleRollout=rolloutPreview.preview('whatsapp_automation',{ targetMode:'beta_only' });
  const sampleKill=killSwitch.preview('voice_ai','security_risk');
  return { ok:true, enabled:flags.enabled, dryRun:flags.dryRun, liveWriteEnabled:flags.allowLiveWrite,
    killSwitchWriteEnabled:flags.allowKillSwitchWrite, requireApproval:flags.requireApproval, requireAudit:flags.requireAudit,
    totalFlags:registry.keys().length, sampleEvalOk:!!sampleEval.featureKey, sampleRolloutOk:sampleRollout.ok===true,
    sampleRolloutDryRun:sampleRollout.ok&&sampleRollout.plan.dryRun===true, sampleKillPreviewOnly:sampleKill.ok&&sampleKill.applied===false,
    checkedAt:new Date().toISOString() };
}
function report(){
  return { ok:true, generatedAt:new Date().toISOString(), dashboard:dashboard(),
    flags:registry.all().map(f=>({ key:f.key, name:f.name, moduleId:f.moduleId, status:f.status, rolloutMode:f.rolloutMode,
      riskLevel:f.riskLevel, requiresApproval:f.requiresApproval, killSwitchEnabled:f.killSwitchEnabled })),
    killSwitches:killSwitches.list() };
}
module.exports={
  flags, config:require('./config'), store:require('./store'),
  privacyGuard:require('./privacyGuard'), safetyGuard:require('./safetyGuard'),
  registry, evaluator, accessDecision:require('./accessDecision'), flagContext:require('./flagContext'),
  rolloutRules:require('./rolloutRules'), rolloutPlanner, rolloutPreview, rolloutHistory,
  killSwitch, killSwitchPlanner:require('./killSwitchPlanner'), killSwitches,
  flowNodes:require('./flowNodes'), adminCommands:require('./adminCommands'),
  adapters:ADAPTERS, dashboard, doctor, report,
};
