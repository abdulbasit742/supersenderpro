// lib/teamAccess/resellerIsolationGuard.js — Reseller staff can only see assigned client previews.
'use strict';
function check(ctx={}){
  if(ctx.resourceResellerId&&ctx.resellerId&&ctx.resourceResellerId!==ctx.resellerId){
    return { ok:false, blocked:true, reason:'reseller_mismatch', note:'Cross-reseller access blocked' };
  }
  // Reseller staff scoped to an explicit assigned-client list.
  if(ctx.roleId==='reseller_staff'&&Array.isArray(ctx.assignedClientIds)&&ctx.resourceId){
    if(!ctx.assignedClientIds.includes(ctx.resourceId)){
      return { ok:false, blocked:true, reason:'client_not_assigned', note:'Reseller staff not assigned to this client' };
    }
  }
  return { ok:true, blocked:false };
}
module.exports={ check };
