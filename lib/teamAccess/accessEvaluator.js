// lib/teamAccess/accessEvaluator.js — Central access decision: role + permission + tenant/reseller isolation
//   + plan seat limit + feature flag + risky-action approval gating. Read-only, dry-run, no auth writes.
'use strict';
const ctxBuilder=require('./accessContext');
const { decision }=require('./accessDecision');
const permissionEvaluator=require('./permissionEvaluator');
const tenantGuard=require('./tenantIsolationGuard');
const resellerGuard=require('./resellerIsolationGuard');
const perms=require('./defaultPermissions');
const seatLimits=require('./seatLimits');
const featureFlagsAdapter=require('./adapters/featureFlagsAdapter');
const securityAdapter=require('./adapters/securityGatewayAdapter');

function evaluate(input={}){
  const ctx=ctxBuilder.build(input);
  const blockers=[]; const warnings=[]; let approvalRequired=false;
  // 1. permission present?
  if(!ctx.permission) blockers.push('permission_missing');
  // 2. role grants permission?
  let pe={ granted:false, risky:false };
  if(ctx.roleId&&ctx.permission){ pe=permissionEvaluator.evaluate(ctx.roleId, ctx.permission);
    if(!pe.granted) blockers.push('permission_not_granted'); }
  else if(ctx.permission){ blockers.push('role_missing'); }
  // 3. tenant isolation
  const t=tenantGuard.check(ctx); if(t.blocked) blockers.push(t.reason);
  // 4. reseller isolation
  const r=resellerGuard.check(ctx); if(r.blocked) blockers.push(r.reason);
  // 5. plan seat limit (warn/block preview)
  if(ctx.planId){ const s=seatLimits.forPlanPreview(ctx.planId, input.activeSeats||0);
    if(s.exceeded){ warnings.push('seat_limit_exceeded'); } }
  // 6. feature flag
  if(ctx.featureFlagKey){ const ff=featureFlagsAdapter.isEnabledPreview(ctx.featureFlagKey, ctx);
    if(ff.available&&ff.enabled===false) blockers.push('feature_flag_disabled'); }
  // 7. risky action -> require approval; consult security gateway
  if(ctx.permission&&perms.isRisky(ctx.permission)){
    approvalRequired=true; warnings.push('risky_permission_requires_approval');
    const sec=securityAdapter.evaluatePreview({ permission:ctx.permission, ctx });
    if(sec.available&&sec.flagged) blockers.push('security_gateway_flagged');
  }
  const allowed=blockers.length===0;
  return { ...decision({ allowed, reason:allowed?(approvalRequired?'granted_pending_approval':'granted'):'blocked',
    permission:ctx.permission, roleId:ctx.roleId, workspaceId:ctx.workspaceId, approvalRequired, blockers, warnings }),
    risky:pe.risky, moduleId:ctx.moduleId };
}
function checkTenant(input={}){ const c=tenantGuard.check(ctxBuilder.build(input)); return { ok:!c.blocked, ...c }; }
function checkReseller(input={}){ const c=resellerGuard.check(ctxBuilder.build(input)); return { ok:!c.blocked, ...c }; }
module.exports={ evaluate, checkTenant, checkReseller };
