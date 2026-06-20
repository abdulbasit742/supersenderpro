// lib/publicSaasFunnel/tenantProvisionPreview.js
// Builds a tenant provisioning PREVIEW. Never creates a real tenant unless
// PUBLIC_FUNNEL_ALLOW_TENANT_WRITE=true AND global dryRun is OFF (still gated by safetyGuard).

const { config } = require('./store');
const safety = require('./safetyGuard');
const businessSetup = require('./adapters/businessSetupAdapter');

function build({ businessType, requestedPlan, modulesRequested = [], leadId } = {}) {
  const preview = businessSetup.setupPreview(businessType, null);
  const g = safety.guard('tenant_write');

  return {
    type: 'tenant_provision_preview',
    leadId: leadId || null,
    businessType: businessType || 'custom',
    requestedPlan: requestedPlan || 'free_trial',
    modulesRequested,
    recommendedModules: preview.recommendedModules,
    readinessChecklist: preview.readinessChecklist,
    tenantWriteAllowed: g.allowed,
    realTenantCreated: false, // funnel never creates a live tenant directly
    note: g.allowed
      ? 'Tenant write flag is enabled, but the public funnel still only produces a preview. Promote via admin tenant tools after review.'
      : 'PREVIEW only — no real tenant created (safe default).',
    createdAt: new Date().toISOString(),
  };
}

module.exports = { build };
