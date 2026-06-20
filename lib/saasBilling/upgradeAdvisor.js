// lib/saasBilling/upgradeAdvisor.js — Recommend upgrades based on usage pressure + gated features.
// Pure analysis, no side effects.

const tenantPlans = require('./tenantPlans');
const planRegistry = require('./planRegistry');
const quotaChecker = require('./quotaChecker');

function recommend(tenantId) {
  const tid = tenantPlans.normalizeTenantId(tenantId);
  const current = tenantPlans.getTenantPlan(tid);
  const quota = quotaChecker.checkTenant(tid);
  const pressure = quota.results.filter((r) => r.level !== 'ok');

  if (!pressure.length) {
    return { tenantId: tid, currentPlan: current.id, recommend: false, reason: 'usage within plan limits', suggestedPlan: null };
  }
  // Find the cheapest higher-priced active plan that raises the pressured limits.
  const higher = planRegistry.getPlans()
    .filter((p) => p.isActive && (p.price || 0) > (current.price || 0))
    .sort((a, b) => (a.price || 0) - (b.price || 0));
  const target = higher.find((p) => pressure.every((r) => {
    const lim = p.limits[r.limitKey];
    return lim === -1 || (lim || 0) > (current.limits[r.limitKey] || 0);
  })) || higher[0] || null;

  return {
    tenantId: tid,
    currentPlan: current.id,
    recommend: !!target,
    reason: `usage pressure on: ${pressure.map((r) => r.limitKey).join(', ')}`,
    pressuredLimits: pressure.map((r) => ({ limitKey: r.limitKey, level: r.level, percent: r.percent })),
    suggestedPlan: target ? target.id : null,
  };
}

module.exports = { recommend };
