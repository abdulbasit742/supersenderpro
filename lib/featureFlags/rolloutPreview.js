// lib/featureFlags/rolloutPreview.js — Preview helpers for each rollout strategy + rollback.
'use strict';
const planner=require('./rolloutPlanner');
const registry=require('./featureRegistry');
function preview(featureKey, target={}){
  const flag=registry.get(featureKey); if(!flag) return { ok:false, error:'unknown_feature', featureKey };
  const p=planner.plan(featureKey, target);
  if(!p.ok) return p;
  return { ok:true, preview:true, dryRun:true, applied:false, feature:{ key:flag.key, name:flag.name, riskLevel:flag.riskLevel },
    plan:p.plan, note:'Preview only — no live flag change was applied.' };
}
function rollbackPreview(featureKey){ return preview(featureKey, { toStatus:'disabled', targetMode:'off' }); }
function killPreview(featureKey){ return preview(featureKey, { toStatus:'killed', targetMode:'killed' }); }
module.exports={ preview, rollbackPreview, killPreview };
