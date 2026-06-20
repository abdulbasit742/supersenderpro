// lib/teamAccess/rolePermissionMatrix.js — Builds the role x permission matrix with risky-permission gating.
// Encodes default safety rules: viewer is read-only, support cannot manage billing,
// sales cannot view raw audit/security, developer cannot see secrets/PII.
'use strict';
const roles=require('./defaultRoles');
const perms=require('./defaultPermissions');

// Explicit safety denials layered on top of role grants.
const HARD_DENY={
  viewer: perms.RISKY.slice(), // viewer never gets any risky/manage permission
  support_agent: ['billing.view','billing.preview','billing.manage'],
  sales_agent: ['audit.view','audit.export_redacted','security.view','security.manage_policy_preview'],
  developer: [], // developer keeps grants but redactor strips secrets/PII at adapter layer
};
function grants(roleId){
  const r=roles.get(roleId); if(!r) return [];
  const deny=new Set(HARD_DENY[roleId]||[]);
  let g=r.permissions.filter(p=>!deny.has(p));
  if(r.readOnly) g=g.filter(p=>!perms.isRisky(p));
  return g;
}
function has(roleId, permissionKey){ return grants(roleId).includes(permissionKey); }
function matrix(){
  return roles.ROLES.map(r=>{
    const g=grants(r.id);
    return { roleId:r.id, label:r.label, readOnly:!!r.readOnly, permissions:g,
      riskyPermissions:g.filter(p=>perms.isRisky(p)), permissionCount:g.length };
  });
}
function permissionList(){ return perms.PERMISSIONS; }
module.exports={ grants, has, matrix, permissionList, HARD_DENY };
