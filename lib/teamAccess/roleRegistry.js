// lib/teamAccess/roleRegistry.js — Read-only registry over default roles + matrix.
// Custom role definitions are preview-only; existing auth/RBAC is never modified.
'use strict';
const roles=require('./defaultRoles');
const matrix=require('./rolePermissionMatrix');
function all(){ return roles.ROLES.map(r=>({ id:r.id, label:r.label, readOnly:!!r.readOnly, permissions:matrix.grants(r.id) })); }
function get(id){ const r=roles.get(id); return r?{ id:r.id, label:r.label, readOnly:!!r.readOnly, permissions:matrix.grants(r.id) }:null; }
function ids(){ return roles.IDS.slice(); }
// Preview a permission change to a role without persisting or touching auth/RBAC.
function permissionChangePreview(roleId, addList=[], removeList=[]){
  const r=get(roleId); if(!r) return { ok:false, error:'role_not_found' };
  const current=new Set(r.permissions);
  (addList||[]).forEach(p=>current.add(p)); (removeList||[]).forEach(p=>current.delete(p));
  return { ok:true, roleId, previewPermissions:[...current], added:addList||[], removed:removeList||[],
    dryRun:true, approvalRequired:true, persisted:false, note:'Role permission change is preview-only' };
}
module.exports={ all, get, ids, permissionChangePreview };
