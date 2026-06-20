// lib/saasBilling/usageMeter.js — Record usage events + expose rollups.
// Recording is DRY-RUN aware: events carry a dryRun flag so downstream consumers
// know whether the count reflects enforced billing. Never stores bodies/secrets.

const store = require('./store');
const { config } = require('./config');
const usageStore = require('./usageStore');
const rollups = require('./usageRollups');
const tenantPlans = require('./tenantPlans');
const { isMetric } = require('./featureCatalog');

// Map a high-level feature to its primary metric (best-effort; metric may be passed directly).
function record({ tenantId, feature, metric, amount = 1, sourceModule = 'unknown', sourceId = null, dryRun } = {}) {
  const tid = tenantPlans.normalizeTenantId(tenantId);
  const m = metric || feature;
  const event = {
    id: store.genId('use'),
    tenantId: tid,
    feature: feature || null,
    metric: m,
    amount: Number(amount) || 0,
    sourceModule,
    sourceId: sourceId ? String(sourceId).slice(0, 64) : null,
    dryRun: dryRun === undefined ? config.dryRun : !!dryRun,
    known: isMetric(m),
    createdAt: store.nowIso(),
  };
  usageStore.append(event);
  return event;
}

function getUsage(tenantId, period = 'monthly') {
  const events = usageStore.forTenant(tenantPlans.normalizeTenantId(tenantId));
  return { tenantId: tenantPlans.normalizeTenantId(tenantId), ...rollups.rollup(events, period) };
}

function getAllPeriods(tenantId) {
  const events = usageStore.forTenant(tenantPlans.normalizeTenantId(tenantId));
  return rollups.allPeriods(events);
}

// Usage summary across every known tenant (for dashboard overview).
function summaryByTenant(period = 'monthly') {
  return tenantPlans.listTenants().map((t) => ({
    tenantId: t.tenantId,
    planId: t.planId,
    usage: rollups.rollup(usageStore.forTenant(t.tenantId), period).totals,
  }));
}

module.exports = { record, getUsage, getAllPeriods, summaryByTenant, rollups };
