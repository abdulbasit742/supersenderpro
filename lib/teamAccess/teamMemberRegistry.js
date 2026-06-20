// lib/teamAccess/teamMemberRegistry.js — Team member seats registry (preview/dry-run, masked PII).
// NEVER creates real auth users. Stores only masked email/phone + safe display fields.
'use strict';
const { paths, flags }=require('./config');
const store=require('./store');
const redactor=require('./redactor');
const roles=require('./defaultRoles');
const SEAT_TYPES=['owner','admin','manager','agent','viewer','reseller_staff','support_agent','accountant','developer','custom'];
const STATUSES=['invited_draft','active_preview','active','suspended_preview','removed_preview','archived'];
function now(){ return new Date().toISOString(); }
function load(){ return store.readJSON(paths.store, { workspaces:[], members:[] }); }
// Local preview store only (gitignored, masked, no PII/tokens). dryRun blocks REAL auth writes, not our own state.
function save(db){ return store.writeJSON(paths.store, db); }
function genId(prefix){ return `${prefix}_${Math.random().toString(36).slice(2,8)}${Date.now().toString(36).slice(-4)}`; }
function normalize(m={}){
  return {
    id:m.id||genId('mem'), workspaceId:m.workspaceId||null,
    userIdSafe:m.userIdSafe||(m.userId?redactor.maskPhone(m.userId)||'***':null),
    displayNameSafe:m.displayNameSafe||m.displayName||'Member',
    emailMasked:m.emailMasked||redactor.maskEmail(m.email)||null,
    phoneMasked:m.phoneMasked||redactor.maskPhone(m.phone)||null,
    roleId:roles.get(m.roleId)?m.roleId:'viewer',
    status:STATUSES.includes(m.status)?m.status:'active_preview',
    seatType:SEAT_TYPES.includes(m.seatType)?m.seatType:'viewer',
    invitedBySafe:m.invitedBySafe||null, lastActiveAt:m.lastActiveAt||null,
    dryRun:m.dryRun!==false, createdAt:m.createdAt||now(), updatedAt:now(),
  };
}
function listByWorkspace(workspaceId){ return load().members.filter(m=>m.workspaceId===workspaceId).map(normalize).map(redactor.safeMember); }
function get(id){ const m=load().members.find(x=>x.id===id); return m?redactor.safeMember(normalize(m)):null; }
function all(){ return load().members.map(normalize).map(redactor.safeMember); }
function upsert(input={}){
  const db=load(); const rec=normalize(input);
  const i=db.members.findIndex(x=>x.id===rec.id);
  if(i>=0) db.members[i]={ ...db.members[i], ...rec }; else db.members.push(rec);
  save(db);
  return { ...redactor.safeMember(rec), preview:flags.allowAuthWrite!==true, persisted:flags.allowAuthWrite===true };
}
// Suspend/remove are preview-only state transitions; no auth user is ever deleted.
function suspendPreview(id){ const m=get(id); if(!m) return { ok:false, error:'member_not_found' };
  return { ok:true, member:{ ...m, status:'suspended_preview' }, dryRun:true, approvalRequired:true, persisted:false, note:'Suspend is preview-only' }; }
function removePreview(id){ const m=get(id); if(!m) return { ok:false, error:'member_not_found' };
  return { ok:true, member:{ ...m, status:'removed_preview' }, dryRun:true, approvalRequired:true, persisted:false, note:'Remove is preview-only; no auth user deleted' }; }
module.exports={ listByWorkspace, get, all, upsert, suspendPreview, removePreview, normalize, SEAT_TYPES, STATUSES, genId };
