// lib/geoAnalytics/engine.js
// Geographic roll-up math. Pure functions over customer records that carry a
// `city` + spend/orders. The CRM already stores `city` on every customer
// (see storeCRM.upsertCustomer), so this needs no new data capture.
//
// Why it's its own module: channel = acquisition source, product = SKU,
// cohort = signup month. None of them tell you WHERE your money physically is —
// which matters for local ads, cash-on-delivery routing, and where to push next.

function round(n, dp = 2) {
  const f = Math.pow(10, dp);
  return Math.round((Number(n) || 0) * f) / f;
}

// Light normalization so "karachi", " Karachi ", "KHI" don't split into 3 rows.
const ALIASES = {
  khi: 'Karachi', karachi: 'Karachi',
  lhr: 'Lahore', lahore: 'Lahore',
  isb: 'Islamabad', islamabad: 'Islamabad',
  rwp: 'Rawalpindi', rawalpindi: 'Rawalpindi',
  fsd: 'Faisalabad', faisalabad: 'Faisalabad',
  multan: 'Multan', peshawar: 'Peshawar', quetta: 'Quetta',
  gujranwala: 'Gujranwala', sialkot: 'Sialkot', hyderabad: 'Hyderabad',
};
function normalizeCity(raw) {
  const t = String(raw || '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!t) return 'Unknown';
  if (ALIASES[t]) return ALIASES[t];
  return t.replace(/\b\w/g, (c) => c.toUpperCase()); // Title Case
}

// customers: [{ city, totalSpent, totalOrders, lastContact }]
function analyze(customers, opts = {}) {
  const now = opts.now || Date.now();
  const DAY = 86400000;
  const map = {};

  for (const c of customers) {
    const city = normalizeCity(c.city);
    if (!map[city]) map[city] = { city, customers: 0, revenue: 0, orders: 0, buyers: 0, active30: 0 };
    const m = map[city];
    m.customers += 1;
    m.revenue += Number(c.totalSpent || 0);
    m.orders += Number(c.totalOrders || 0);
    if (Number(c.totalOrders || 0) > 0) m.buyers += 1;
    if (c.lastContact && (now - new Date(c.lastContact).getTime()) <= 30 * DAY) m.active30 += 1;
  }

  const totalRevenue = Object.values(map).reduce((s, m) => s + m.revenue, 0);
  const totalCustomers = Object.values(map).reduce((s, m) => s + m.customers, 0);

  const regions = Object.values(map).map((m) => ({
    city: m.city,
    customers: m.customers,
    revenue: round(m.revenue),
    orders: m.orders,
    avgOrderValue: m.orders ? round(m.revenue / m.orders) : 0,
    revenuePerCustomer: m.customers ? round(m.revenue / m.customers) : 0,
    buyerRatePct: m.customers ? round((m.buyers / m.customers) * 100) : 0,
    active30dPct: m.customers ? round((m.active30 / m.customers) * 100) : 0,
    revenueSharePct: totalRevenue > 0 ? round((m.revenue / totalRevenue) * 100) : 0,
    customerSharePct: totalCustomers > 0 ? round((m.customers / totalCustomers) * 100) : 0,
  })).sort((a, b) => b.revenue - a.revenue);

  // Underpenetrated = meaningful customer share but lower revenue share
  // (lots of people, not enough money — a conversion/upsell opportunity).
  const opportunities = regions
    .filter((r) => r.customers >= 3 && r.customerSharePct - r.revenueSharePct >= 5)
    .map((r) => ({ city: r.city, gapPct: round(r.customerSharePct - r.revenueSharePct), customers: r.customers, buyerRatePct: r.buyerRatePct }))
    .sort((a, b) => b.gapPct - a.gapPct)
    .slice(0, 10);

  return {
    summary: {
      cities: regions.length,
      totalRevenue: round(totalRevenue),
      totalCustomers,
      topCity: regions[0] ? regions[0].city : null,
      knownCityPct: totalCustomers ? round(((totalCustomers - (map['Unknown'] ? map['Unknown'].customers : 0)) / totalCustomers) * 100) : 0,
    },
    regions,
    opportunities,
  };
}

module.exports = { analyze, normalizeCity, round };
