// lib/featureFlags/safetyGuard.js — Enforces dry-run, no-live-write, approval-required defaults.
'use strict';
function bool(v, def=false){ if(v===undefined||v===null||v==='') return def; return String(v).trim().toLowerCase()==='true'; }
const flags={
  enabled: bool(process.env.FEATURE_FLAGS_ENABLED, true),
  dryRun: bool(process.env.FEATURE_FLAGS_DRY_RUN, true),
  allowLiveWrite: bool(process.env.FEATURE_FLAGS_ALLOW_LIVE_WRITE, false),
  allowKillSwitchWrite: bool(process.env.FEATURE_FLAGS_ALLOW_KILL_SWITCH_WRITE, false),
  requireApproval: bool(process.env.FEATURE_FLAGS_REQUIRE_APPROVAL, true),
  requireAudit: bool(process.env.FEATURE_FLAGS_REQUIRE_AUDIT, true),
  defaultRolloutMode: process.env.FEATURE_FLAGS_DEFAULT_ROLLOUT_MODE || 'off',
  enableBetaGroups: bool(process.env.FEATURE_FLAGS_ENABLE_BETA_GROUPS, true),
  strict: bool(process.env.FEATURE_FLAGS_STRICT, false),
};
// A flag write is only "live" when explicitly enabled; otherwise it's a local preview.
function canLiveWrite(){ return flags.allowLiveWrite===true; }
function canKillSwitchWrite(){ return flags.allowKillSwitchWrite===true; }
function writeMode(){ return canLiveWrite()?'live':'preview'; }
// Wrap any would-be flag mutation: returns preview unless live write is enabled.
function guardWrite(action){
  if(canLiveWrite()) return { allowed:true, mode:'live', dryRun:false, approvalRequired:flags.requireApproval, action };
  return { allowed:false, mode:'preview', dryRun:true, approvalRequired:true, action, reason:'live_write_disabled_preview_only' };
}
function guardKill(action){
  if(canKillSwitchWrite()) return { allowed:true, mode:'live', dryRun:false, approvalRequired:true, auditRequired:true, action };
  return { allowed:false, mode:'preview', dryRun:true, approvalRequired:true, auditRequired:true, action, reason:'kill_switch_write_disabled_preview_only' };
}
module.exports={ flags, bool, canLiveWrite, canKillSwitchWrite, writeMode, guardWrite, guardKill };
