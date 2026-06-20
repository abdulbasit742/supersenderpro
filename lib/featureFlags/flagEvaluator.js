// lib/featureFlags/flagEvaluator.js — Evaluates feature access against a context. Pure, no writes.
'use strict';
const registry=require('./featureRegistry');
const rules=require('./rolloutRules');
const { isKilled }=require('./killSwitches');
const { decide }=require('./accessDecision');
const ctxBuilder=require('./flagContext');

function evaluate(featureKey, rawCtx={}){
  const flag=registry.get(featureKey);
  if(!flag) return decide({ featureKey, allowed:false, reason:'unknown_feature', status:'archived', requiresApproval:false, blockers:['feature_not_found'] });
  const ctx=ctxBuilder.build(rawCtx);
  const blockers=[]; const warnings=[];

  // 1) Kill switch always blocks.
  if(isKilled(flag)) return decide({ featureKey, allowed:false, reason:'kill_switch_active', status:'killed', requiresApproval:flag.requiresApproval, blockers:['kill_switch_active'] });
  // 2) Env override (explicit) wins after kill switch.
  if(ctx.envOverride===false) return decide({ featureKey, allowed:false, reason:'env_override_off', status:flag.status, requiresApproval:flag.requiresApproval });
  // 3) Security / compliance blockers.
  if(['high','critical'].includes(ctx.securityRisk)) blockers.push(`security_risk:${ctx.securityRisk}`);
  if(ctx.complianceStatus==='blocked') blockers.push('compliance_blocked');
  if(ctx.moduleHealth==='down') warnings.push('module_down_health');
  // 4) High/critical risk requires approval for live access.
  if(['high','critical'].includes(flag.riskLevel) && flag.requiresApproval && flag.status!=='enabled')
    warnings.push('high_risk_requires_approval_for_live');
  // 5) Plan insufficiency → billing upgrade preview (not a hard error).
  if(!rules.planMeets(ctx.planId, flag.allowedPlans))
    return decide({ featureKey, allowed:false, reason:'plan_insufficient', status:flag.status, requiresApproval:flag.requiresApproval,
      warnings, extra:{ billingUpgradePreview:{ requiredPlans:flag.allowedPlans, currentPlan:ctx.planId } } });
  // 6) Rollout mode predicate.
  const m=rules.modeAllows(flag, ctx);
  if(blockers.length) return decide({ featureKey, allowed:false, reason:'blocked', status:flag.status, requiresApproval:flag.requiresApproval, blockers, warnings });
  if(!m.ok) return decide({ featureKey, allowed:false, reason:m.reason, status:flag.status, requiresApproval:flag.requiresApproval, warnings });
  return decide({ featureKey, allowed:true, reason:m.reason||'allowed', status:flag.status, requiresApproval:flag.requiresApproval, warnings });
}
module.exports={ evaluate };
