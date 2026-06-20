// lib/teamAccess/tenantIsolationGuard.js — Blocks cross-tenant access; never exposes other tenant data.
'use strict';
const { flags }=require('./safetyGuard');
function check(ctx={}){
  if(!flags.enforceTenantIsolation) return { ok:true, isolated:false, note:'tenant isolation disabled by config' };
  if(ctx.resourceTenantId&&ctx.tenantId&&ctx.resourceTenantId!==ctx.tenantId){
    return { ok:false, blocked:true, reason:'tenant_mismatch', note:'Cross-tenant access blocked' };
  }
  return { ok:true, blocked:false };
}
module.exports={ check };
