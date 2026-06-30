'use strict';
/**
 * lib/billing/index.js - per-tenant subscriptions, usage metering, quota enforcement.
 * Builds on the tenant-scoped repository (lib/db, PR #86): subscription + usage rows
 * are stored per tenant. Gated behind auth (PR #90) at the route layer.
 */
const repo = require('../db');
const plans = require('./plans');

const nowISO = () => new Date().toISOString();
const period = (d = new Date()) => d.toISOString().slice(0, 7); // YYYY-MM

async function getSubscription(tenantId) {
  repo.assertTenant(tenantId);
  const rows = await repo.list(tenantId, 'subscriptions', {});
  let sub = rows[0];
  if (!sub) {
    sub = await repo.create(tenantId, 'subscriptions', {
      planId: plans.defaultPlanId(), status: 'active', // active | past_due | canceled | grace
      provider: null, stripeCustomerId: null, stripeSubscriptionId: null,
      currentPeriodEnd: null, graceUntil: null,
    });
  }
  return sub;
}

async function setPlan(tenantId, planId, extra = {}) {
  if (!plans.getPlan(planId)) throw new Error('unknown plan: ' + planId);
  const sub = await getSubscription(tenantId);
  return repo.update(tenantId, 'subscriptions', sub.id, Object.assign({ planId, updatedAt: nowISO() }, extra));
}

async function setStatus(tenantId, status, extra = {}) {
  const sub = await getSubscription(tenantId);
  return repo.update(tenantId, 'subscriptions', sub.id, Object.assign({ status, updatedAt: nowISO() }, extra));
}

async function planFor(tenantId) {
  const sub = await getSubscription(tenantId);
  return { subscription: sub, plan: plans.getPlan(sub.planId) || plans.getPlan(plans.defaultPlanId()) };
}

/* ------------------------------- usage metering ------------------------------- */
async function recordUsage(tenantId, metric, qty = 1) {
  repo.assertTenant(tenantId);
  const p = period();
  const rows = await repo.list(tenantId, 'usage', { period: p, metric });
  if (rows[0]) return repo.update(tenantId, 'usage', rows[0].id, { value: (rows[0].value || 0) + qty, updatedAt: nowISO() });
  return repo.create(tenantId, 'usage', { period: p, metric, value: qty });
}
async function getUsage(tenantId, p = period()) {
  const rows = await repo.list(tenantId, 'usage', { period: p });
  return rows.reduce((acc, r) => { acc[r.metric] = r.value; return acc; }, {});
}

/* ------------------------------ quota enforcement ----------------------------- */
// metric maps to a plan limit key. Returns { allowed, limit, used, remaining }.
const METRIC_TO_LIMIT = { messagesPerMonth: 'messagesPerMonth', message: 'messagesPerMonth', broadcast: 'broadcasts', contact: 'contacts', seat: 'seats' };
async function checkQuota(tenantId, metric, wouldAdd = 1) {
  const { plan } = await planFor(tenantId);
  const limitKey = METRIC_TO_LIMIT[metric] || metric;
  const limit = plan.limits[limitKey];
  if (limit === undefined || limit === -1) return { allowed: true, unlimited: true, limit: -1 };
  const usage = await getUsage(tenantId);
  const used = usage[limitKey] || usage[metric] || 0;
  const remaining = Math.max(0, limit - used);
  return { allowed: used + wouldAdd <= limit, limit, used, remaining };
}

module.exports = {
  plans, period,
  getSubscription, setPlan, setStatus, planFor,
  recordUsage, getUsage, checkQuota,
};
