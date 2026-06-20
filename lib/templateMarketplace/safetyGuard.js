// lib/templateMarketplace/safetyGuard.js — Enforces dry-run, approval-required, no-live-install defaults.
'use strict';
function bool(v, def=false){ if(v===undefined||v===null||v==='') return def; return String(v).trim().toLowerCase()==='true'; }
const flags={
  enabled: bool(process.env.TEMPLATE_MARKETPLACE_ENABLED, true),
  dryRun: bool(process.env.TEMPLATE_MARKETPLACE_DRY_RUN, true),
  allowInstall: bool(process.env.TEMPLATE_MARKETPLACE_ALLOW_INSTALL, false),
  allowLiveActions: bool(process.env.TEMPLATE_MARKETPLACE_ALLOW_LIVE_ACTIONS, false),
  aiLive: bool(process.env.TEMPLATE_MARKETPLACE_AI_LIVE, false),
  requireApproval: bool(process.env.TEMPLATE_MARKETPLACE_REQUIRE_APPROVAL, true),
  publicGallery: bool(process.env.TEMPLATE_MARKETPLACE_PUBLIC_GALLERY, true),
  strict: bool(process.env.TEMPLATE_MARKETPLACE_STRICT, false),
  defaultLanguage: process.env.TEMPLATE_MARKETPLACE_DEFAULT_LANGUAGE || 'roman_urdu',
};
// Live install is blocked unless BOTH allowInstall and allowLiveActions are explicitly true.
function canInstallLive(){ return flags.allowInstall===true && flags.allowLiveActions===true; }
function installMode(){ return canInstallLive()?'live':'preview'; }
// Wrap any would-be install/automation effect as a preview unless live is explicitly enabled.
function guardInstall(action){
  if(canInstallLive()) return { allowed:true, mode:'live', dryRun:false, approvalRequired:flags.requireApproval, action };
  return { allowed:false, mode:'preview', dryRun:true, approvalRequired:true, action,
    reason:'live_install_disabled_preview_only' };
}
module.exports={ flags, bool, canInstallLive, installMode, guardInstall };
