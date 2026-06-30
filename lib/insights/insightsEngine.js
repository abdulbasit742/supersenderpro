'use strict';
/**
 * insightsEngine.js — Analytics & Insights department.
 *
 * One place that turns raw orders/customers/messages into the numbers a founder checks every day:
 * revenue, average order value, new vs repeat customers, conversion, and per-channel performance.
 *
 * Storage-agnostic by design: the caller injects loaders (so this works against today's JSON data
 * and tomorrow's Postgres without changing the math). All functions are pure over plain arrays.
 *
 *   setLoaders({ orders, customers, messages })
 *     orders()    -> [{ id, total, status, channel, customerId|customerPhone, createdAt }]
 *     customers() -> [{ id|phone, createdAt, firstOrderAt?, orderCount? }]
 *     messages()  -> [{ id, channel, direction:'in'|'out', createdAt }]   (optional)
 */

let loaders = { orders: null, customers: null, messages: null };
function setLoaders(l = {}) {
  loaders = { ...loaders, ...l };
}

function asArray(fn) {
  try { const v = typeof fn === 'function' ? fn() : []; return Array.isArray(v) ? v : []; }
  catch { return []; }
}

function inRange(ts, fromT, toT) {
  const t = new Date(ts).getTime();
  return t >= fromT && t <= toT;
}
function round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }
function pct(part, whole) { return whole ? Math.round((part / whole) * 1000) / 10 : 0; }

// A "paid" order = anything not draft/cancelled/failed. Tune to your status vocabulary.
function isPaid(order) {
  const s = String(order.status || '').toLowerCase();
  return !['draft', 'cancelled', 'canceled', 'failed', 'refunded', 'pending'].includes(s);
}

function rangeBounds({ from, to } = {}) {
  return {
    fromT: from ? new Date(from).getTime() : -Infinity,
    toT: to ? new Date(to).getTime() : Infinity
  };
}

// ---------------------------------------------------------------------------
// Revenue
// ---------------------------------------------------------------------------
function revenue(opts = {}) {
  const { fromT, toT } = rangeBounds(opts);
  const orders = asArray(loaders.orders).filter(o => isPaid(o) && inRange(o.createdAt, fromT, toT));
  const total = orders.reduce((s, o) => s + (Number(o.total) || 0), 0);
  const count = orders.length;
  return {
    total: round2(total),
    orders: count,
    averageOrderValue: count ? round2(total / count) : 0,
    from: opts.from || null,
    to: opts.to || null
  };
}

// ---------------------------------------------------------------------------
// Customers: new vs repeat
// ---------------------------------------------------------------------------
function customerBreakdown(opts = {}) {
  const { fromT, toT } = rangeBounds(opts);
  const orders = asArray(loaders.orders).filter(o => isPaid(o));
  const byCustomer = new Map();
  for (const o of orders) {
    const key = String(o.customerId || o.customerPhone || '').trim();
    if (!key) continue;
    if (!byCustomer.has(key)) byCustomer.set(key, []);
    byCustomer.get(key).push(o);
  }
  let newCount = 0, repeat = 0;
  for (const [, list] of byCustomer) {
    list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const firstInRange = inRange(list[0].createdAt, fromT, toT);
    const hasMultiple = list.length > 1;
    if (firstInRange) newCount++;
    if (hasMultiple) repeat++;
  }
  const totalCustomers = byCustomer.size;
  return {
    totalCustomers,
    newCustomers: newCount,
    repeatCustomers: repeat,
    repeatRate: pct(repeat, totalCustomers)
  };
}

// ---------------------------------------------------------------------------
// Channel performance
// ---------------------------------------------------------------------------
function channelPerformance(opts = {}) {
  const { fromT, toT } = rangeBounds(opts);
  const orders = asArray(loaders.orders).filter(o => isPaid(o) && inRange(o.createdAt, fromT, toT));
  const by = {};
  for (const o of orders) {
    const ch = o.channel || 'unknown';
    if (!by[ch]) by[ch] = { channel: ch, orders: 0, revenue: 0 };
    by[ch].orders++;
    by[ch].revenue += Number(o.total) || 0;
  }
  return Object.values(by)
    .map(c => ({ ...c, revenue: round2(c.revenue), aov: c.orders ? round2(c.revenue / c.orders) : 0 }))
    .sort((a, b) => b.revenue - a.revenue);
}

// ---------------------------------------------------------------------------
// Conversion: leads/customers -> paying
// ---------------------------------------------------------------------------
function conversion(opts = {}) {
  const customers = asArray(loaders.customers);
  const orders = asArray(loaders.orders).filter(isPaid);
  const payingKeys = new Set(orders.map(o => String(o.customerId || o.customerPhone || '').trim()).filter(Boolean));
  const totalLeads = customers.length;
  const paying = payingKeys.size;
  return {
    totalLeads,
    payingCustomers: paying,
    conversionRate: pct(paying, totalLeads)
  };
}

// ---------------------------------------------------------------------------
// One-call founder dashboard
// ---------------------------------------------------------------------------
function dashboard(opts = {}) {
  return {
    generatedAt: new Date().toISOString(),
    range: { from: opts.from || null, to: opts.to || null },
    revenue: revenue(opts),
    customers: customerBreakdown(opts),
    conversion: conversion(opts),
    channels: channelPerformance(opts)
  };
}

module.exports = {
  setLoaders,
  revenue,
  customerBreakdown,
  channelPerformance,
  conversion,
  dashboard
};
