// lib/saasBilling/featureGate.js — Answer "can this tenant use this feature/action?".
// Default posture is warnOnly=true and dryRun. It NEVER blocks unless live enforcement
// is explicitly enabled AND the action is non-critical (see safetyGuard).

const { config } = require('./config');
const tenantPlans = require('./tenantPlans');
const planRegistry = require('./planRegistry');
const licenseEngine = require('./licenseEngine');
const quotaChecker = require('./quotaChecker');
const safetyGuard = require('./safetyGuard');
const { isFeature } = require('./featureCatalog');

// Suggest the cheapest PAID self-serve plan that includes a feature (for upgrade prompts).
// Excludes sales-assisted plans (enterprise/custom) and zero-priced plans so we never
// "recommend" a $0 enterprise tier just because it sorts cheapest.
function suggestPlanFor(feature) {
  const SALES_ASSISTED = new Set(['enterprise', 'custom']);
  const plans = planRegistry.getPlans()
    .filter((p) => p.isActive && p.features[feature] && (p.price || 0) > 0 && !SALES_ASSISTED.has(p.tier));
  plans.sort((a, b) => (a.price || 0) - (b.price || 0));
  return plans[0] ? plans[0].id : 'pro';
}

// Merge plan features with any per-license overrides.
function effectiveFeatures(tenantId) {
  const plan = tenantPlans.getTenantPlan(tenantId);
  const lic = licenseEngine.getLicense(tenantId);
  const merged = { ...(plan.features || {}) };
  if (lic && lic.featureOverrides) Object.assign(merged, lic.featureOverrides);
  return { plan, lic, merged };
}

// Core decision. metric (optional) ties the check to a usage limit.
function check({ tenantId, feature, action = 'use', metric = null, increment = 1 } = {}) {
  const tid = tenantPlans.normalizeTenantId(tenantId);
  const { plan, lic, merged } = effectiveFeatures(tid);

  const reasons = [];
  let allowed = true;
  let upgradeRequired = false;

  // 1. license entitlement
  const licStatus = lic ? lic.status : 'none';
  const licEntitled = lic ? lic.entitled : true; // no license => don't block by default
  if (lic && !licEntitled) { allowed = false; reasons.push(`license ${licStatus}`); }

  // 2. feature gate
  if (feature && isFeature(feature) && !merged[feature]) {
    allowed = false; upgradeRequired = true;
    reasons.push(`feature '${feature}' not in plan '${plan.id}'`);
  }

  // 3. usage limit
  let quota = null;
  if (metric) {
    quota = quotaChecker.check({ tenantId: tid, metric, increment });
    if (quota.wouldExceed) { allowed = false; upgradeRequired = true; reasons.push(`usage limit reached for ${metric}`); }
  }

  // Decide enforcement posture for this action.
  const willBlock = !allowed && safetyGuard.shouldBlock(action) && !safetyGuard.isProtectedAction(action);

  return {
    allowed: willBlock ? false : true,   // effective allow: warn-only never blocks
    softAllowed: allowed,                // what the rules say, ignoring enforcement posture
    dryRun: config.dryRun,
    warnOnly: !willBlock,
    blocked: willBlock,
    tenantId: tid,
    feature: feature || null,
    action,
    metric,
    reason: reasons.join('; ') || 'ok',
    currentUsage: quota && quota.row ? quota.row.used : null,
    limit: quota && quota.row ? quota.row.limit : null,
    upgradeRequired,
    suggestedPlan: upgradeRequired && feature ? suggestPlanFor(feature) : null,
    licenseStatus: licStatus,
  };
}

// Preview what WOULD happen if live enforcement were enabled (does not change config).
function previewEnforcement(input) {
  const decision = check(input);
  const wouldBlockIfLive = !decision.softAllowed && !safetyGuard.isProtectedAction(input.action || 'use');
  return {
    ...decision,
    preview: true,
    wouldBlockIfLiveEnforcement: wouldBlockIfLive,
    protectedAction: safetyGuard.isProtectedAction(input.action || 'use'),
    currentlyEnforcing: config.effective.liveEnforcement,
  };
}

module.exports = { check, previewEnforcement, suggestPlanFor, effectiveFeatures };
