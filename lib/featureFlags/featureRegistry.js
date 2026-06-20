// lib/featureFlags/featureRegistry.js — Loads default + persisted flags; create/update (preview/local).
'use strict';
const { paths }=require('./config');
const { readJSON, writeJSON, appendHistory }=require('./store');
const { DEFAULT_FEATURES }=require('./defaultFeatureRegistry');
const { guardWrite }=require('./safetyGuard');

function _saved(){ return readJSON(paths.store, {}); }
function all(){
  const saved=_saved(); const custom=Array.isArray(saved.flags)?saved.flags:[];
  const m=new Map(); DEFAULT_FEATURES.forEach(f=>m.set(f.key,f)); custom.forEach(f=>m.set(f.key,f));
  return [...m.values()];
}
function get(key){ return all().find(f=>f.key===key||f.id===key)||null; }
function keys(){ return all().map(f=>f.key); }
// Upsert is a LOCAL config write (still dry-run-flagged). Live propagation gated by safetyGuard elsewhere.
function upsert(flag){
  const saved=_saved(); saved.flags=Array.isArray(saved.flags)?saved.flags:[];
  const now=new Date().toISOString();
  const base={ category:'experimental', status:'draft', enabled:false, defaultValue:false, rolloutMode:'off',
    rolloutPercent:0, allowedPlans:['business'], allowedTenants:[], allowedResellers:[], allowedRoles:['admin'],
    requiresApproval:true, riskLevel:'medium', killSwitchEnabled:false, dryRun:true, createdAt:now };
  const i=saved.flags.findIndex(f=>f.key===flag.key);
  if(i>=0) saved.flags[i]={ ...saved.flags[i], ...flag, updatedAt:now };
  else saved.flags.push({ ...base, ...flag, updatedAt:now });
  writeJSON(paths.store, saved);
  appendHistory(paths.history,{ type:'flag_upsert', key:flag.key, mode:guardWrite('flag_upsert').mode });
  return get(flag.key);
}
module.exports={ all, get, keys, upsert };
