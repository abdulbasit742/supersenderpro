// lib/analyticsInsights/index.js
// Orchestrates data sources + engine + churn model into a single snapshot object.
// This is the one function both the API route and the overnight batch call, so
// the live dashboard and the batch snapshot always agree on shape.

const ds = require('./dataSources');
const engine = require('./analyticsEngine');
const churn = require('./churnModel');

function buildStoreSnapshot(storeId, now = Date.now()) {
  const customers = ds.getCustomers(storeId);
  const interactions = ds.getInteractions(storeId);
  const subs = ds.getSubscriptions();

  const revenue = engine.revenueMetrics(customers, interactions, subs, now);
  const conversion = engine.conversionMetrics(customers, subs);
  const channels = engine.withRevenueShare(engine.channelMetrics(customers));
  const churnScores = churn.buildScores(customers, now);
  const subChurn = churn.subscriptionChurn(subs, now);

  return {
    storeId,
    generatedAt: new Date(now).toISOString(),
    headline: {
      revenue: revenue.totalRevenue,
      mrr: revenue.mrr,
      customers: customers.length,
      orders: revenue.totalOrders,
      leadToCustomerPct: conversion.leadToCustomerPct,
      predictedChurnRatePct: churnScores.predictedChurnRatePct,
      revenueAtRisk: churnScores.revenueAtRisk,
    },
    revenue,
    conversion,
    channels,
    churn: { ...churnScores, subscription: subChurn },
  };
}

// Merge per-store snapshots into a workspace-wide ("all stores") view.
function buildAllSnapshot(now = Date.now()) {
  const storeIds = ds.listStoreIds();
  const stores = storeIds.map((id) => buildStoreSnapshot(id, now));

  const agg = stores.reduce(
    (a, s) => {
      a.revenue += s.revenue.totalRevenue;
      a.mrr += s.revenue.mrr;
      a.customers += s.headline.customers;
      a.orders += s.revenue.totalOrders;
      a.revenueAtRisk += s.churn.revenueAtRisk;
      return a;
    },
    { revenue: 0, mrr: 0, customers: 0, orders: 0, revenueAtRisk: 0 }
  );

  return {
    generatedAt: new Date(now).toISOString(),
    scope: 'all_stores',
    stores: storeIds,
    headline: {
      revenue: engine.round(agg.revenue),
      mrr: engine.round(agg.mrr),
      customers: agg.customers,
      orders: agg.orders,
      revenueAtRisk: engine.round(agg.revenueAtRisk),
    },
    // The default store is surfaced as `primary` for the single-pane dashboard.
    primary: stores.find((s) => s.storeId === 'default_store') || stores[0] || null,
    perStore: stores,
  };
}

module.exports = { buildStoreSnapshot, buildAllSnapshot };
