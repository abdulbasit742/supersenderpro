// lib/teamAccess/safetyGuard.js — Enforces dry-run, no-auth-write, no-live-invite, approval-required defaults.
// This module NEVER creates real auth users, sends real invites, or mutates existing auth/RBAC/billing.
'use strict';
function bool(v, def=false){ if(v===undefined||v===null||v==='') return def; return String(v).trim().toLowerCase()==='true'; }
const flags={
  enabled: bool(process.env.TEAM_ACCESS_ENABLED, true),
  dryRun: bool(process.env.TEAM_ACCESS_DRY_RUN, true),
  allowAuthWrite: bool(process.env.TEAM_ACCESS_ALLOW_AUTH_WRITE, false),
  allowLiveInvites: bool(process.env.TEAM_ACCESS_ALLOW_LIVE_INVITES, false),
  requireApproval: bool(process.env.TEAM_ACCESS_REQUIRE_APPROVAL, true),
  requireAudit: bool(process.env.TEAM_ACCESS_REQUIRE_AUDIT, true),
  enforceTenantIsolation: bool(process.env.TEAM_ACCESS_ENFORCE_TENANT_ISOLATION, true),
  redactPII: bool(process.env.TEAM_ACCESS_REDACT_PII, true),
  defaultLanguage: process.env.TEAM_ACCESS_DEFAULT_LANGUAGE || 'roman_urdu',
  strict: bool(process.env.TEAM_ACCESS_STRICT, false),
};
// A member/auth write is only "live" when explicitly enabled; otherwise it's a local preview only.
function canAuthWrite(){ return flags.allowAuthWrite===true; }
function canLiveInvite(){ return flags.allowLiveInvites===true; }
function writeMode(){ return canAuthWrite()?'live':'preview'; }
// Wrap any would-be member/auth mutation: returns preview unless auth write is explicitly enabled.
function guardAuthWrite(action){
  if(canAuthWrite()) return { allowed:true, mode:'live', dryRun:false, approvalRequired:flags.requireApproval, action };
  return { allowed:false, mode:'preview', dryRun:true, approvalRequired:true, action, reason:'auth_write_disabled_preview_only' };
}
// Wrap any would-be invite send: returns draft preview unless live invites explicitly enabled.
function guardInvite(action){
  if(canLiveInvite()) return { allowed:true, mode:'live', dryRun:false, approvalRequired:true, action };
  return { allowed:false, mode:'preview', dryRun:true, approvalRequired:true, action, reason:'live_invite_disabled_draft_only' };
}
module.exports={ flags, bool, canAuthWrite, canLiveInvite, writeMode, guardAuthWrite, guardInvite };
