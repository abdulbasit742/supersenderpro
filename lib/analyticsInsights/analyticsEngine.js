// lib/analyticsInsights/analyticsEngine.js
// Pure metric computation: revenue, conversion funnel, channel performance.
// No I/O here — callers pass in already-loaded records, so this stays trivially
// testable and cheap to run inside the PC #2 overnight batch.

const DAY = 86400000;

function startOfDay(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d;
}
function dayKey(ts) {
  return startOfDay(ts).toISOString().slice(0, 10);
}
function round(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}
function pct(a, b) {
  return b > 0 ? round((a / b) * 100) : 0;
}

// --- Revenue ----------------------------------------------------------------
function revenueMetrics(customers, interactions, subs, now = Date.now()) {
  const orderEvents = interactions.filter((i) => i && i.type === 'order' && Number(i.amount) > 0);

  // Lifetime revenue: prefer dated order events; fall back to CRM totalSpent.
  const orderRevenue = orderEvents.reduce((s, o) => s + Number(o.amount || 0), 0);
  const crmRevenue = customers.reduce((s, c) => s + Number(c.totalSpent || 0), 0);
  const totalRevenue = orderRevenue || crmRevenue;

  // Daily revenue series for the last 30 days.
  const byDay = {};
  for (const o of orderEvents) {
    if (!o.ts) continue;
    const k = dayKey(o.ts);
    byDay[k] = (byDay[k] || 0) + Number(o.amount || 0);
  }
  const series = [];
  for (let i = 29; i >= 0; i--) {
    const key = dayKey(now - i * DAY);
    series.push({ date: key, revenue: round(byDay[key] || 0) });
  }

  const last7 = series.slice(-7).reduce((s, p) => s + p.revenue, 0);
  const prev7 = series.slice(-14, -7).reduce((s, p) => s + p.revenue, 0);
  const last30 = series.reduce((s, p) => s + p.revenue, 0);
  const wowGrowthPct = prev7 > 0 ? round(((last7 - prev7) / prev7) * 100) : null;

  // MRR from currently-active subscriptions.
  let mrr = 0;
  for (const u of Object.values(subs.users || {})) {
    if (!u) continue;
    const active = u.active !== false && (!u.expiresAt || new Date(u.expiresAt).getTime() > now);
    if (active) mrr += Number(subs.planPrices[u.tier] || 0);
  }

  const totalOrders = orderEvents.length || customers.reduce((s, c) => s + Number(c.totalOrders || 0), 0);
  const payingCustomers = customers.filter((c) => Number(c.totalSpent || 0) > 0).length;

  return {
    totalRevenue: round(totalRevenue),
    revenueLast7Days: round(last7),
    revenueLast30Days: round(last30),
    wowGrowthPct,
    mrr: round(mrr),
    arr: round(mrr * 12),
    totalOrders,
    avgOrderValue: totalOrders ? round(totalRevenue / totalOrders) : 0,
    arpu: payingCustomers ? round(totalRevenue / payingCustomers) : 0,
    dailySeries: series,
  };
}

// --- Conversion -------------------------------------------------------------
function conversionMetrics(customers, subs) {
  const contacts = customers.length;
  const engaged = customers.filter((c) => c.lastContact || (c.totalOrders || 0) > 0).length;
  const ordered = customers.filter((c) => (c.totalOrders || 0) > 0).length;
  const repeat = customers.filter((c) => (c.totalOrders || 0) > 1).length;

  const users = Object.values(subs.users || {});
  const paid = users.filter(
    (u) => u && u.tier && u.tier !== 'starter' && Number(subs.planPrices[u.tier] || 0) > 0
  ).length;

  return {
    funnel: [
      { stage: 'Contacts', count: contacts, pctOfTop: 100 },
      { stage: 'Engaged', count: engaged, pctOfTop: pct(engaged, contacts) },
      { stage: 'Ordered', count: ordered, pctOfTop: pct(ordered, contacts) },
      { stage: 'Repeat buyers', count: repeat, pctOfTop: pct(repeat, contacts) },
    ],
    leadToCustomerPct: pct(ordered, contacts),
    repeatPurchasePct: pct(repeat, ordered),
    engagementPct: pct(engaged, contacts),
    subscription: {
      totalUsers: users.length,
      paidUsers: paid,
      freeToPaidPct: pct(paid, users.length),
    },
  };
}

// --- Channel performance ----------------------------------------------------
function channelMetrics(customers) {
  const map = {};
  for (const c of customers) {
    const ch = (c.source || 'unknown').toString();
    if (!map[ch]) map[ch] = { channel: ch, customers: 0, ordered: 0, revenue: 0, orders: 0 };
    const m = map[ch];
    m.customers += 1;
    m.revenue += Number(c.totalSpent || 0);
    m.orders += Number(c.totalOrders || 0);
    if ((c.totalOrders || 0) > 0) m.ordered += 1;
  }
  return Object.values(map)
    .map((m) => ({
      channel: m.channel,
      customers: m.customers,
      revenue: round(m.revenue),
      orders: m.orders,
      conversionPct: pct(m.ordered, m.customers),
      avgOrderValue: m.orders ? round(m.revenue / m.orders) : 0,
      revenueSharePct: 0, // filled by withRevenueShare()
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

function withRevenueShare(channels) {
  const total = channels.reduce((s, c) => s + c.revenue, 0);
  return channels.map((c) => ({ ...c, revenueSharePct: total ? round((c.revenue / total) * 100) : 0 }));
}

module.exports = { revenueMetrics, conversionMetrics, channelMetrics, withRevenueShare, round, pct };
