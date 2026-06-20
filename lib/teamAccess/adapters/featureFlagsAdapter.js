// adapters/featureFlagsAdapter.js — Feature Flags integration (read-only enabled preview). No rollout writes.
'use strict';
let mod=null, available=false;
try{ mod=require('../../../lib/featureFlags'); available=true; }catch(_e){ available=false; }
function isEnabledPreview(featureKey, ctx={}){
  if(!available||!featureKey) return { available, enabled:null, featureKey:featureKey||null, note:'Feature Flags not detected' };
  try{ const d=mod.evaluator.evaluate(featureKey, ctx||{}); return { available:true, enabled:!!d.allowed, featureKey, dryRun:true }; }
  catch(_e){ return { available:true, enabled:null, featureKey, note:'evaluation_unavailable' }; }
}
module.exports={ available, isEnabledPreview };
