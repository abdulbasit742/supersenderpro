// lib/saasBilling/tenantPlans.js — Maps tenants to plans, adapting the EXISTING
// lib/subscriptionPlans.js (starter/pro/unlimited, keyed by phone) without rebuilding it.
// New plan assignments live in our own store; existing subscriptions are surfaced read-only.

const { config } = require('./config');
const store = require('./store');
const planRegistry = require('./planRegistry');

// Best-effort, non-fatal load of the legacy subscription module.
let legacy = null;
try { legacy = require('../subscriptionPlans'); } catch (_e) { legacy = null; }

// Map legacy tiers -> new plan ids so existing customers keep working.
const LEGACY_TIER_MAP = { starter: 'starter', pro: 'pro', unlimited: 'enterprise' };

function normalizeTenantId(tenantId) {
  return (tenantId === undefined || tenantId === null || tenantId === '') ? 'default' : String(tenantId);
}

function _data() {
  const d = store.readJSON(config.paths.store, null) || {};
  if (!d.tenantPlans) d.tenantPlans = {};
  return d;
}

// Returns the plan id assigned to a tenant. Resolution order:
// 1. explicit assignment in our store  2. legacy subscription tier  3. free_trial default.
function getTenantPlanId(tenantId) {
  const tid = normalizeTenantId(tenantId);
  const d = _data();
  if (d.tenantPlans[tid] && d.tenantPlans[tid].planId) return d.tenantPlans[tid].planId;
  if (legacy && typeof legacy.getUserSubscription === 'function') {
    try {
      const sub = legacy.getUserSubscription(tid);
      if (sub && sub.tier && LEGACY_TIER_MAP[sub.tier]) return LEGACY_TIER_MAP[sub.tier];
    } catch (_e) { /* ignore */ }
  }
  return 'free_trial';
}

function getTenantPlan(tenantId) {
  return planRegistry.getPlan(getTenantPlanId(tenantId)) || planRegistry.getPlan('free_trial');
}

// Assign a plan locally (does NOT mutate the legacy store unless explicitly enabled).
function assignTenantPlan(tenantId, planId, opts = {}) {
  const tid = normalizeTenantId(tenantId);
  if (!planRegistry.getPlan(planId)) throw new Error(`unknown planId: ${planId}`);
  const data = store.readJSON(config.paths.store, null) || {};
  if (!data.tenantPlans) data.tenantPlans = {};
  data.tenantPlans[tid] = { planId, assignedAt: store.nowIso(), source: opts.source || 'saas-billing' };
  store.writeJSON(config.paths.store, data);
  return data.tenantPlans[tid];
}

// List known tenants from our store + legacy users (deduplicated, ids only — no PII).
function listTenants() {
  const ids = new Set(Object.keys(_data().tenantPlans));
  if (legacy && typeof legacy.getPlans === 'function') {
    try {
      const raw = store.readDataFile('subscription_plans.json', null);
      if (raw && raw.users) Object.keys(raw.users).forEach((k) => ids.add(String(k)));
    } catch (_e) { /* ignore */ }
  }
  if (!ids.size) ids.add('default');
  return [...ids].map((tid) => ({ tenantId: tid, planId: getTenantPlanId(tid) }));
}

module.exports = { normalizeTenantId, getTenantPlanId, getTenantPlan, assignTenantPlan, listTenants, LEGACY_TIER_MAP, legacyAvailable: !!legacy };
