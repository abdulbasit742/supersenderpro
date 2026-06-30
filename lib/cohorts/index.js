// lib/cohorts/index.js
// Orchestrator: pull order events out of the CRM interaction log, run the cohort
// engine, and shape a snapshot the dashboard + batch can both consume. Reads
// storeCRM only; rebuilds nothing.

const engine = require('./cohortEngine');

let storeCRM = null;
try { storeCRM = require('../storeCRM'); } catch { /* optional */ }

// Collect every dated order across all customers in a store.
function collectOrders(storeId) {
  if (!storeCRM) return [];
  const customers = storeCRM.getAllCustomers(storeId) || [];
  const orders = [];
  for (const c of customers) {
    if (!c.phone) continue;
    const interactions = storeCRM.getCustomerInteractions(storeId, c.phone, 500) || [];
    for (const i of interactions) {
      if (i.type === 'order' && i.ts && Number(i.amount) > 0) {
        orders.push({ phone: c.phone, ts: i.ts, amount: Number(i.amount) });
      }
    }
    // Fallback: customer has totalOrders/totalSpent but no dated order events.
    if (!interactions.some((i) => i.type === 'order') && Number(c.totalOrders || 0) > 0 && c.firstContact) {
      orders.push({ phone: c.phone, ts: c.firstContact, amount: Number(c.totalSpent || 0) });
    }
  }
  return orders;
}

function buildSnapshot(storeId = 'default_store', now = Date.now()) {
  const orders = collectOrders(storeId);
  const { cohorts, maxMonthsTracked, nowKey } = engine.buildCohorts(orders, now);

  // Portfolio roll-ups.
  const totalCustomers = cohorts.reduce((s, c) => s + c.size, 0);
  const totalRevenue = engine.round(cohorts.reduce((s, c) => s + c.totalRevenue, 0));
  const withM1 = cohorts.filter((c) => c.m1RetentionPct != null);
  const avgM1 = withM1.length ? engine.round(withM1.reduce((s, c) => s + c.m1RetentionPct, 0) / withM1.length) : null;
  const withM3 = cohorts.filter((c) => c.m3RetentionPct != null);
  const avgM3 = withM3.length ? engine.round(withM3.reduce((s, c) => s + c.m3RetentionPct, 0) / withM3.length) : null;

  // Trend: is M1 retention improving for newer cohorts vs older?
  let m1Trend = null;
  if (withM1.length >= 4) {
    const half = Math.floor(withM1.length / 2);
    const older = withM1.slice(0, half);
    const newer = withM1.slice(half);
    const avg = (arr) => arr.reduce((s, c) => s + c.m1RetentionPct, 0) / arr.length;
    m1Trend = engine.round(avg(newer) - avg(older));
  }

  return {
    storeId,
    generatedAt: new Date(now).toISOString(),
    asOfMonth: nowKey,
    summary: {
      cohorts: cohorts.length,
      totalCustomers,
      totalRevenue,
      avgM1RetentionPct: avgM1,
      avgM3RetentionPct: avgM3,
      m1RetentionTrendPct: m1Trend, // +ve = newer cohorts stickier
      maxMonthsTracked,
    },
    cohorts,
  };
}

function buildAllSnapshot(now = Date.now()) {
  let ids = ['default_store'];
  try { ids = require('../analyticsInsights/dataSources').listStoreIds(); } catch { /* default */ }
  const stores = ids.map((id) => buildSnapshot(id, now));
  return { generatedAt: new Date(now).toISOString(), stores: ids, perStore: stores, primary: stores.find((s) => s.storeId === 'default_store') || stores[0] || null };
}

module.exports = { buildSnapshot, buildAllSnapshot, collectOrders };
