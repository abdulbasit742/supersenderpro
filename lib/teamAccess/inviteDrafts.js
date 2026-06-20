// lib/teamAccess/inviteDrafts.js — Invite DRAFT workflow. No live invite, no real auth user, no token.
'use strict';
const { paths, flags }=require('./config');
const store=require('./store');
const redactor=require('./redactor');
const templates=require('./inviteTemplates');
const validator=require('./inviteValidator');
const workspaces=require('./workspaceRegistry');
const { guardInvite }=require('./safetyGuard');
const STATUSES=['draft','pending_approval','ready_to_send_preview','sent_manual','expired','cancelled'];
function now(){ return new Date().toISOString(); }
function genId(){ return `inv_${Math.random().toString(36).slice(2,8)}${Date.now().toString(36).slice(-4)}`; }
function load(){ return store.readJSON(paths.invites, { invites:[] }); }
// Local invite-DRAFT store only (gitignored, masked, no tokens). Never a live invite send.
function save(db){ return store.writeJSON(paths.invites, db); }
function create(input={}){
  const v=validator.validate(input);
  if(!v.ok) return { ok:false, error:'invalid_invite', validation:v };
  const ws=workspaces.get(input.workspaceId);
  const emailMasked=input.emailMasked||redactor.maskEmail(input.email)||null;
  const phoneMasked=input.phoneMasked||redactor.maskPhone(input.phone)||null;
  const msg=templates.draftMessage({ businessName:ws?ws.businessName:'your workspace', roleId:input.roleId, emailMasked:emailMasked||'***@***' });
  const guard=guardInvite('create_invite');
  const rec={
    id:genId(), workspaceId:input.workspaceId, emailMasked, phoneMasked,
    roleId:input.roleId, seatType:input.seatType||'viewer',
    inviteMessageDraft:msg, status:flags.requireApproval?'pending_approval':'draft',
    expiresAtPreview:new Date(Date.now()+7*864e5).toISOString(), dryRun:true, createdAt:now(),
  };
  const db=load(); db.invites.unshift({ id:rec.id, workspaceId:rec.workspaceId, emailMasked, phoneMasked,
    roleId:rec.roleId, seatType:rec.seatType, status:rec.status, expiresAtPreview:rec.expiresAtPreview, dryRun:true, createdAt:rec.createdAt }); save(db);
  return { ok:true, invite:rec, liveInviteSent:false, realUserCreated:false, inviteTokenExposed:false,
    sendMode:guard.mode, approvalRequired:true, warnings:v.warnings };
}
function list(limit=100){ return load().invites.slice(0,limit); }
function get(id){ return load().invites.find(i=>i.id===id)||null; }
function cancelPreview(id){ const inv=get(id); if(!inv) return { ok:false, error:'invite_not_found' };
  return { ok:true, invite:{ ...inv, status:'cancelled' }, dryRun:true, persisted:false, note:'Cancel is preview-only' }; }
module.exports={ create, list, get, cancelPreview, STATUSES };
