// lib/featureFlags/rolloutPlanner.js — Builds a rollout plan. Never applies live changes by default.
'use strict';
const registry=require('./featureRegistry');
const { guardWrite, flags }=require('./safetyGuard');
const history=require('./rolloutHistory');
let approvalAdapter; try{ approvalAdapter=require('./adapters/approvalInboxAdapter'); }catch(_e){ approvalAdapter=null; }

const VALID_MODES=['off','all','beta_only','tenant_allowlist','reseller_allowlist','plan_based','percentage_preview','admin_only','killed'];
function estimateImpact(flag, target){
  const mode=target.targetMode||flag.rolloutMode;
  if(mode==='all') return 'all eligible tenants';
  if(mode==='killed'||mode==='off') return 'no tenants (disabled)';
  if(mode==='percentage_preview') return `~${target.targetPercent||flag.rolloutPercent||0}% of tenants (preview bucket)`;
  if(mode==='plan_based') return `plans: ${(target.targetPlans||flag.allowedPlans||[]).join(', ')}`;
  if(mode==='tenant_allowlist') return `${(target.targetTenants||[]).length} tenant(s)`;
  if(mode==='reseller_allowlist') return `${(target.targetResellers||[]).length} reseller(s)`;
  if(mode==='beta_only') return 'beta group only';
  return 'admin only';
}
function plan(featureKey, target={}){
  const flag=registry.get(featureKey);
  if(!flag) return { ok:false, error:'unknown_feature', featureKey };
  const guard=guardWrite('rollout_apply');
  const blockers=[]; const warnings=[];
  if(target.targetMode && !VALID_MODES.includes(target.targetMode)) blockers.push(`invalid_mode:${target.targetMode}`);
  if(['high','critical'].includes(flag.riskLevel)) warnings.push(`high_risk_feature(${flag.riskLevel}) — approval required before live`);
  if(guard.allowed===false && target.requireLive) blockers.push('live_write_disabled');
  const requiredApprovals=(['high','critical'].includes(flag.riskLevel)||flag.requiresApproval)?['admin']:[];
  // High-risk rollouts create an approval-item PREVIEW (never auto-approved).
  let approvalPreview=null;
  if(requiredApprovals.length && approvalAdapter) approvalPreview=approvalAdapter.createApprovalPreview({ kind:'rollout', featureKey, target });
  const p={ id:`rollout_${Date.now()}`, featureKey, fromStatus:flag.status, toStatus:target.toStatus||flag.status,
    targetMode:target.targetMode||flag.rolloutMode, targetPercent:target.targetPercent!=null?target.targetPercent:flag.rolloutPercent,
    targetPlans:target.targetPlans||flag.allowedPlans, targetTenants:target.targetTenants||flag.allowedTenants,
    targetResellers:target.targetResellers||flag.allowedResellers, estimatedImpact:estimateImpact(flag,target),
    requiredApprovals, approvalPreview, blockers, warnings, dryRun:true, mode:guard.mode, createdAt:new Date().toISOString() };
  history.record({ type:'rollout_planned', featureKey, mode:p.targetMode });
  return { ok:true, plan:p };
}
module.exports={ plan, VALID_MODES, estimateImpact };
