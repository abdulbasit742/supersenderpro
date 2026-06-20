// lib/featureFlags/rolloutRules.js — Pure rollout-mode predicates (no side effects).
'use strict';
const PLAN_RANK={ free:0, pro:1, business:2, enterprise:3 };
function planMeets(planId, allowedPlans){ if(!allowedPlans||!allowedPlans.length) return true; return allowedPlans.map(p=>p.toLowerCase()).includes((planId||'free').toLowerCase()); }
// Deterministic bucket 0-99 from tenant/reseller id for percentage preview (no randomness).
function bucket(id){ const s=String(id||'anon'); let h=0; for(let i=0;i<s.length;i++){ h=(h*31+s.charCodeAt(i))>>>0; } return h%100; }
function modeAllows(flag, ctx){
  const mode=flag.rolloutMode||'off';
  switch(mode){
    case 'all': return { ok:true };
    case 'off': return { ok:false, reason:'rollout_off' };
    case 'killed': return { ok:false, reason:'rollout_killed' };
    case 'admin_only': return { ok:ctx.userRole==='admin', reason:'admin_only' };
    case 'beta_only': return { ok:ctx.betaGroup===true, reason:'beta_only' };
    case 'tenant_allowlist': return { ok:(flag.allowedTenants||[]).includes(ctx.tenantId), reason:'tenant_allowlist' };
    case 'reseller_allowlist': return { ok:(flag.allowedResellers||[]).includes(ctx.resellerId), reason:'reseller_allowlist' };
    case 'plan_based': return { ok:planMeets(ctx.planId, flag.allowedPlans), reason:'plan_based' };
    case 'percentage_preview': { const b=ctx.atPercent!=null?ctx.atPercent:bucket(ctx.tenantId||ctx.resellerId);
      return { ok:b < (flag.rolloutPercent||0), reason:`percentage_preview(bucket ${b} < ${flag.rolloutPercent||0})` }; }
    default: return { ok:false, reason:`unknown_mode:${mode}` };
  }
}
module.exports={ modeAllows, planMeets, bucket, PLAN_RANK };
