// lib/teamAccess/index.js — Barrel for the Team Seats + Role Permissions + Tenant Workspace Access Command Center.
// Coordination layer ONLY. Does NOT rebuild auth/RBAC/session/billing/tenant/reseller/security/audit modules.
// All actions are dry-run, no-auth-write, no-live-invite, approval-required by default.
'use strict';
const { flags }=require('./safetyGuard');
const workspaces=require('./workspaceRegistry');
const members=require('./teamMemberRegistry');
const roles=require('./roleRegistry');
const matrix=require('./rolePermissionMatrix');
const permissions=require('./defaultPermissions');
const evaluator=require('./accessEvaluator');
const seatLimits=require('./seatLimits');
const seatUsage=require('./seatUsage');
const invites=require('./inviteDrafts');
const riskyActionGate=require('./riskyActionGate');
const privacyGuard=require('./privacyGuard');

const ADAPTERS={
  auth:require('./adapters/authAdapter'), tenantPortal:require('./adapters/tenantPortalAdapter'),
  resellerPortal:require('./adapters/resellerPortalAdapter'), featureFlags:require('./adapters/featureFlagsAdapter'),
  securityGateway:require('./adapters/securityGatewayAdapter'), approvalInbox:require('./adapters/approvalInboxAdapter'),
  auditLedger:require('./adapters/auditLedgerAdapter'), compliance:require('./adapters/complianceAdapter'),
  supportHelpdesk:require('./adapters/supportHelpdeskAdapter'), customer360:require('./adapters/customer360Adapter'),
  developerPortal:require('./adapters/developerPortalAdapter'), ownerCommand:require('./adapters/ownerCommandAdapter'),
  kpiCommand:require('./adapters/kpiCommandAdapter'), saasBilling:require('./adapters/saasBillingAdapter'),
};
function dashboard(){
  const ws=workspaces.all(); const allMembers=members.all();
  const invDrafts=invites.list(500);
  const seatWarnings=ws.map(w=>seatUsage.preview(w.id)).filter(s=>s.ok&&s.exceeded).length;
  const m=matrix.matrix();
  return {
    overview:{
      workspaces:ws.length, activePreviewSeats:allMembers.filter(x=>['active','active_preview'].includes(x.status)).length,
      pendingInviteDrafts:invDrafts.filter(i=>['draft','pending_approval'].includes(i.status)).length,
      seatLimitWarnings:seatWarnings,
      highRiskPermissions:permissions.RISKY.length,
      tenantIsolationEnabled:flags.enforceTenantIsolation,
    },
    workspaces:ws.map(w=>({ id:w.id, businessName:w.businessName, workspaceType:w.workspaceType, planId:w.planId,
      seatUsage:seatUsage.preview(w.id), status:w.status, resellerId:privacyGuard.maskId(w.resellerId) })),
    roles:m, adapters:Object.fromEntries(Object.entries(ADAPTERS).map(([k,a])=>[k, a.available===true])),
    safety:safety(),
  };
}
function safety(){
  return { dryRun:flags.dryRun, authWriteDisabled:!flags.allowAuthWrite, liveInvitesDisabled:!flags.allowLiveInvites,
    piiMasked:flags.redactPII, tenantIsolationEnabled:flags.enforceTenantIsolation,
    requireApproval:flags.requireApproval, requireAudit:flags.requireAudit,
    auditIntegration:ADAPTERS.auditLedger.available, securityIntegration:ADAPTERS.securityGateway.available,
    approvalIntegration:ADAPTERS.approvalInbox.available };
}
function doctor(){
  const sample=evaluator.evaluate({ roleId:'support_agent', workspaceId:'ws_demo', permission:'billing.manage' });
  const ok=sample.allowed===false; // support agent must be blocked from billing.manage
  return { ok, enabled:flags.enabled, dryRun:flags.dryRun, authWriteEnabled:flags.allowAuthWrite, liveInvitesEnabled:flags.allowLiveInvites,
    requireApproval:flags.requireApproval, requireAudit:flags.requireAudit, enforceTenantIsolation:flags.enforceTenantIsolation,
    totalRoles:roles.ids().length, totalPermissions:permissions.KEYS.length, riskyPermissions:permissions.RISKY.length,
    sampleAllowed:sample.allowed, adapters:Object.fromEntries(Object.entries(ADAPTERS).map(([k,a])=>[k, a.available===true])),
    checkedAt:new Date().toISOString() };
}
function report(){
  return { ok:true, generatedAt:new Date().toISOString(), dashboard:dashboard(),
    roles:matrix.matrix(), permissions:permissions.PERMISSIONS, seatPlans:seatLimits.FALLBACK };
}
module.exports={
  flags, config:require('./config'), store:require('./store'),
  privacyGuard, redactor:require('./redactor'), safetyGuard:require('./safetyGuard'),
  workspaces, members, roles, matrix, permissions, evaluator,
  seatLimits, seatUsage, invites, riskyActionGate,
  flowNodes:require('./flowNodes'), adminCommands:require('./adminCommands'),
  adapters:ADAPTERS, dashboard, doctor, report, safety,
};
