'use strict';


/**
    * SaaS Billing — feature entitlement check (preview). Returns whether a plan
    * includes a feature + which plan would unlock it.
    */


const subscription = require('./subscriptionModel');
const catalog = require('./planCatalog');

function checkPreview(tenantId, feature, planIdOverride) {
     const sub = subscription.getForTenant(tenantId);
     const planId = planIdOverride || sub.planId;
     const plan = catalog.get(planId) || catalog.get('free_preview');
     const allowed = (plan.features || []).indexOf(feature) !== -1;
     const warnings = [], blockers = [];
     let unlockPlan = null;
     if (!allowed) {
       // Find the cheapest plan that includes the feature.
         const ordered = catalog.list();
         const match = ordered.find(function (p) { return (p.features || []).indexOf(feature) !== -1; });
         unlockPlan = match ? match.id : null;
         warnings.push(unlockPlan ? ('Feature requires ' + unlockPlan + ' (preview).') : 'Feature not available in any plan (preview).');
  }
  return { ok: true, dryRun: true, feature: feature, planId: planId, allowedPreview: allowed, upgradeRequiredPreview:
!allowed, unlockPlanPreview: unlockPlan, warnings: warnings, blockers: blockers };
}


module.exports = { checkPreview };
