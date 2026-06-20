// lib/teamAccess/riskyActionGate.js — Blocks live risky actions; allows preview/draft only.
// Requires approval if Approval Inbox exists, writes redacted audit if Audit Ledger exists,
// consults Security Gateway if available. Never performs the live action.
'use strict';
const map=require('./modulePermissionMap');
const evaluator=require('./accessEvaluator');
const approvalAdapter=require('./adapters/approvalInboxAdapter');
const auditAdapter=require('./adapters/auditLedgerAdapter');
const securityAdapter=require('./adapters/securityGatewayAdapter');
function check(input={}){
  const m=map.get(input.actionType);
  if(!m) return { ok:false, error:'unknown_action_type', actionType:input.actionType, allowedActions:map.actions() };
  const access=evaluator.evaluate({ ...input, permission:m.permission, moduleId:m.moduleId });
  const security=securityAdapter.evaluatePreview({ permission:m.permission, ctx:input });
  const approval=approvalAdapter.requestPreview({ kind:'risky_action', actionType:input.actionType, permission:m.permission });
  const audit=auditAdapter.auditPreview({ kind:'risky_action_preview', actionType:input.actionType, permission:m.permission });
  return {
    ok:true, actionType:input.actionType, moduleId:m.moduleId, requiredPermission:m.permission,
    liveActionAllowed:false, mode:'preview',
    permissionAllowed:access.allowed, approvalRequired:true,
    blockers:access.blockers, warnings:access.warnings,
    approval, audit, security, dryRun:true,
    note:'Live risky action blocked by default — preview/draft only',
  };
}
module.exports={ check, actions:map.actions };
