// lib/tenantIsolation/boundaryContext.js — Normalizes a boundary context (safe, redacted identifiers).
const { safeActorId } = require('./privacyGuard');
const ACTOR_TYPES = ['tenant', 'reseller', 'workspace_member', 'support_agent', 'developer_app', 'public', 'admin', 'system'];
function normalize(input = {}) {
  return {
    actorType: ACTOR_TYPES.includes(input.actorType) ? input.actorType : 'public',
    actorIdSafe: input.actorIdSafe || safeActorId(input.actorId || input.actorIdSafe),
    workspaceId: input.workspaceId || null,
    tenantId: input.tenantId || null,
    resellerId: input.resellerId || null,
    clientId: input.clientId || null,
    roleId: input.roleId || null,
    planId: input.planId || null,
    sourceModule: String(input.sourceModule || 'unknown').slice(0, 60),
    route: String(input.route || '').slice(0, 160),
    actionType: String(input.actionType || 'read').slice(0, 40),
    resourceType: String(input.resourceType || 'generic').slice(0, 40),
    resourceIdSafe: input.resourceIdSafe || (input.resourceId ? safeActorId(input.resourceId) : null),
    // Target ownership for cross-boundary checks (kept as-is for comparison; never returned raw in responses)
    targetTenantId: input.targetTenantId || null,
    targetWorkspaceId: input.targetWorkspaceId || null,
    targetClientId: input.targetClientId || null,
    assignedClientIds: Array.isArray(input.assignedClientIds) ? input.assignedClientIds : [],
    providedScopes: Array.isArray(input.providedScopes) ? input.providedScopes : [],
    requiredScope: input.requiredScope || null,
    authPresent: input.authPresent === true,
    requestsPrivateData: input.requestsPrivateData === true,
    dryRun: true,
    createdAt: new Date().toISOString(),
  };
}
module.exports = { normalize, ACTOR_TYPES };
