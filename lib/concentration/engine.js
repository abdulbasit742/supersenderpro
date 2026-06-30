// lib/concentration/engine.js
// Revenue-concentration / dependency-risk math. Answers a question none of the
// other modules do: how EXPOSED is the business to losing a few big customers?
//
// Distinct from neighbours:
//   - CLV = value of each customer going forward.
//   - RFM = which segment each customer is in.
//   - This = the SHAPE of the revenue distribution + concentration risk.
//
// Metrics:
//   topNShare      = % of revenue from the top N customers
//   Gini           = 0 (perfectly even) .. 1 (one customer = all revenue)
//   HHI            = sum of squared revenue shares (0..1); >0.25 = concentrated
//   singleBuyerExposure = % revenue from the single biggest customer

function round(n, dp = 2) { const f = Math.pow(10, dp); return Math.round((Number(n) || 0) * f) / f; }

// Gini coefficient over an array of non-negative values.
function gini(values) {
  const v = values.filter((x) => x >= 0).slice().sort((a, b) => a - b);
  const n = v.length;
  if (n === 0) return 0;
  const total = v.reduce((s, x) => s + x, 0);
  if (total === 0) return 0;
  // Gini = (2*sum(i*x_i) / (n*sum(x))) - (n+1)/n   with i = 1..n
  let cum = 0;
  for (let i = 0; i < n; i++) cum += (i + 1) * v[i];
  return round((2 * cum) / (n * total) - (n + 1) / n, 4);
}

// Lorenz curve points (cumulative % customers vs cumulative % revenue), for the
// dashboard. Sorted ascending so the curve bows below the equality line.
function lorenz(values, points = 20) {
  const v = values.filter((x) => x >= 0).slice().sort((a, b) => a - b);
  const n = v.length;
  const total = v.reduce((s, x) => s + x, 0);
  const out = [{ pctCustomers: 0, pctRevenue: 0 }];
  if (!n || !total) return out;
  let cum = 0;
  for (let i = 0; i < n; i++) {
    cum += v[i];
    // sample down to ~`points` markers for a clean SVG
    if (i % Math.max(1, Math.floor(n / points)) === 0 || i === n - 1) {
      out.push({ pctCustomers: round(((i + 1) / n) * 100), pctRevenue: round((cum / total) * 100) });
    }
  }
  return out;
}

function analyze(customers, opts = {}) {
  const rows = customers
    .filter((c) => c && c.phone)
    .map((c) => ({ phone: c.phone, name: c.name || '', revenue: Math.max(0, Number(c.totalSpent || 0)) }))
    .filter((c) => c.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue);

  const total = rows.reduce((s, r) => s + r.revenue, 0);
  const n = rows.length;

  const topShare = (k) => {
    if (!total) return 0;
    const slice = rows.slice(0, k).reduce((s, r) => s + r.revenue, 0);
    return round((slice / total) * 100);
  };

  const hhi = total > 0 ? round(rows.reduce((s, r) => s + Math.pow(r.revenue / total, 2), 0), 4) : 0;
  const g = gini(rows.map((r) => r.revenue));

  // Risk verdict from the blend of single-buyer exposure + HHI.
  const single = topShare(1);
  let risk = 'low';
  if (single >= 40 || hhi >= 0.25) risk = 'high';
  else if (single >= 20 || hhi >= 0.15) risk = 'moderate';

  return {
    summary: {
      payingCustomers: n,
      totalRevenue: round(total),
      top1SharePct: topShare(1),
      top5SharePct: topShare(5),
      top10SharePct: topShare(10),
      top20SharePct: topShare(20),
      gini: g,
      hhi,
      singleBuyerExposurePct: single,
      risk,
    },
    lorenz: lorenz(rows.map((r) => r.revenue)),
    topCustomers: rows.slice(0, 20).map((r) => ({ name: r.name, revenue: round(r.revenue), sharePct: total ? round((r.revenue / total) * 100) : 0 })),
  };
}

module.exports = { analyze, gini, lorenz, round };
