// lib/teamAccess/accessDecision.js — Standard access decision factory.
'use strict';
function decision({ allowed, reason, permission, roleId, workspaceId, approvalRequired=false, blockers=[], warnings=[] }){
  return { allowed:!!allowed, reason:reason||(allowed?'granted':'denied'), permission:permission||null,
    roleId:roleId||null, workspaceId:workspaceId||null, dryRun:true, approvalRequired:!!approvalRequired,
    blockers:blockers||[], warnings:warnings||[], at:new Date().toISOString() };
}
module.exports={ decision };
