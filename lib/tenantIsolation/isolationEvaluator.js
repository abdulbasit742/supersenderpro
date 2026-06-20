// lib/tenantIsolation/isolationEvaluator.js — Core boundary decision engine. Dry-run / report-only by default.
const { config } = require('./config');
const { normalize } = require('./boundaryContext');
const { scrub } = require('./privacyGuard');

function decide(rawCtx = {}) {
  const ctx = normalize(rawCtx);
  const blockers = [];
  const warnings = [];
  let boundaryType = rawCtx.boundaryType || 'generic';
  let allowed = true;
  let reason = 'within_boundary';

  // Tenant boundary
  if (ctx.tenantId && ctx.targetTenantId && ctx.tenantId !== ctx.targetTenantId) {
    boundaryType = 'tenant'; blockers.push('tenant_mismatch'); allowed = false; reason = 'cross_tenant_access_blocked';
  }
  // Workspace boundary
  if (ctx.workspaceId && ctx.targetWorkspaceId && ctx.workspaceId !== ctx.targetWorkspaceId) {
    boundaryType = 'workspace'; blockers.push('workspace_mismatch'); allowed = false; reason = 'cross_workspace_access_blocked';
  }
  // Reseller/client assignment
  if (ctx.actorType === 'reseller' && ctx.targetClientId && ctx.assignedClientIds.length && !ctx.assignedClientIds.includes(ctx.targetClientId)) {
    boundaryType = 'reseller'; blockers.push('client_not_assigned'); allowed = false; reason = 'reseller_client_boundary_blocked';
  }
  // Public requesting private data
  if (ctx.actorType === 'public' && ctx.requestsPrivateData) {
    boundaryType = 'public'; blockers.push('public_requests_private_data'); allowed = false; reason = 'public_private_data_blocked';
  }
  // Developer scope insufficient
  if (ctx.actorType === 'developer_app' && ctx.requiredScope && !ctx.providedScopes.includes(ctx.requiredScope)) {
    boundaryType = 'developer_api'; blockers.push('developer_scope_insufficient'); allowed = false; reason = 'developer_scope_blocked';
  }
  // Admin route lacks auth guard -> warn (preview)
  if (/\/api\/admin\//.test(ctx.route) && !ctx.authPresent) {
    warnings.push('admin_route_missing_auth_guard'); if (boundaryType === 'generic') boundaryType = 'admin';
  }

  let riskLevel = 'low';
  if (blockers.length) riskLevel = blockers.some((b) => /tenant|workspace|public/.test(b)) ? 'critical' : 'high';
  else if (warnings.length) riskLevel = 'medium';

  return {
    allowed, // policy verdict (a mismatch yields allowed=false even in dry-run)
    enforcedLive: !config.dryRun && !allowed,
    reason,
    boundaryType,
    riskLevel,
    blockers,
    warnings,
    redactedContext: scrub({ actorType: ctx.actorType, actorIdSafe: ctx.actorIdSafe, sourceModule: ctx.sourceModule, route: ctx.route, actionType: ctx.actionType, resourceType: ctx.resourceType }),
    dryRun: config.dryRun === true,
  };
}
module.exports = { decide };
