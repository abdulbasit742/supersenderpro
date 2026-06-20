// lib/teamAccess/accessContext.js — Normalizes an access-check request into a safe context object.
'use strict';
function build(input={}){
  return {
    workspaceId:input.workspaceId||null, tenantId:input.tenantId||null, resellerId:input.resellerId||null,
    memberId:input.memberId||null, roleId:input.roleId||null, permission:input.permission||null,
    moduleId:input.moduleId||null, resourceId:input.resourceId||null, actionType:input.actionType||'view',
    planId:input.planId||null, featureFlagKey:input.featureFlagKey||null,
    // private resource ownership (used by isolation guards)
    resourceTenantId:input.resourceTenantId||null, resourceResellerId:input.resourceResellerId||null,
    assignedClientIds:Array.isArray(input.assignedClientIds)?input.assignedClientIds:null,
  };
}
module.exports={ build };
