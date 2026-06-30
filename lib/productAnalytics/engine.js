// lib/productAnalytics/engine.js
// Product/SKU performance math. Pure functions over a list of order line records
// ({ product, amount, phone, ts }), so it's testable and cheap in the PC #2
// overnight window. This is the one analytics angle the other modules don't
// cover: channel = where, cohort = when, attribution = which touch, and THIS =
// which product actually makes the money.

const DAY = 86400000;

function round(n, dp = 2) {
  const f = Math.pow(10, dp);
  return Math.round((Number(n) || 0) * f) / f;
}

// Classify a product from its recency + repeat behaviour + revenue share.
//   star        : high revenue share AND recently selling
//   steady      : selling recently, moderate share
//   slow_mover  : low share, few units
//   dormant     : nothing sold in `dormantDays`
function classify(p, totalRevenue, now, dormantDays) {
  const sharePct = totalRevenue > 0 ? (p.revenue / totalRevenue) * 100 : 0;
  const daysSinceLast = p.lastSoldTs ? (now - p.lastSoldTs) / DAY : Infinity;
  if (daysSinceLast > dormantDays) return 'dormant';
  if (sharePct >= 15 && daysSinceLast <= 30) return 'star';
  if (p.units <= 2 && sharePct < 5) return 'slow_mover';
  return 'steady';
}

// orders: [{ product, amount, phone, ts }]. Returns ranked products + summary.
function analyze(orders, opts = {}) {
  const now = opts.now || Date.now();
  const dormantDays = opts.dormantDays || 60;

  const map = {};
  for (const o of orders) {
    const name = (o.product || '').toString().trim() || 'Unspecified';
    if (!map[name]) map[name] = { product: name, revenue: 0, units: 0, buyers: new Set(), repeatBuyers: new Set(), seen: {}, firstSoldTs: null, lastSoldTs: null };
    const p = map[name];
    const amt = Number(o.amount || 0);
    p.revenue += amt;
    p.units += 1;
    const ts = o.ts ? new Date(o.ts).getTime() : now;
    if (p.firstSoldTs == null || ts < p.firstSoldTs) p.firstSoldTs = ts;
    if (p.lastSoldTs == null || ts > p.lastSoldTs) p.lastSoldTs = ts;
    if (o.phone) {
      if (p.seen[o.phone]) p.repeatBuyers.add(o.phone);
      p.seen[o.phone] = true;
      p.buyers.add(o.phone);
    }
  }

  const totalRevenue = Object.values(map).reduce((s, p) => s + p.revenue, 0);

  let products = Object.values(map).map((p) => {
    const buyers = p.buyers.size;
    const repeat = p.repeatBuyers.size;
    return {
      product: p.product,
      revenue: round(p.revenue),
      units: p.units,
      buyers,
      avgPrice: p.units ? round(p.revenue / p.units) : 0,
      revenueSharePct: totalRevenue > 0 ? round((p.revenue / totalRevenue) * 100) : 0,
      repeatBuyRatePct: buyers ? round((repeat / buyers) * 100) : 0,
      daysSinceLastSale: p.lastSoldTs ? Math.round((now - p.lastSoldTs) / DAY) : null,
      class: classify({ revenue: p.revenue, units: p.units, lastSoldTs: p.lastSoldTs }, totalRevenue, now, dormantDays),
    };
  }).sort((a, b) => b.revenue - a.revenue);

  // Pareto: how few products make 80% of revenue?
  let cum = 0;
  let paretoCount = 0;
  for (const p of products) {
    cum += p.revenue;
    paretoCount += 1;
    if (totalRevenue > 0 && cum >= totalRevenue * 0.8) break;
  }

  const counts = products.reduce((acc, p) => { acc[p.class] = (acc[p.class] || 0) + 1; return acc; }, {});

  return {
    summary: {
      products: products.length,
      totalRevenue: round(totalRevenue),
      totalUnits: products.reduce((s, p) => s + p.units, 0),
      paretoProductsFor80Pct: paretoCount,
      paretoSharePct: products.length ? round((paretoCount / products.length) * 100) : 0,
      classCounts: counts,
    },
    products,
  };
}

module.exports = { analyze, classify, round };
