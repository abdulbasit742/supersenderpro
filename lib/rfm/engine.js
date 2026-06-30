// lib/rfm/engine.js
// Classic RFM (Recency, Frequency, Monetary) segmentation. Scores every customer
// 1-5 on each axis using QUINTILES of the actual customer base (so the segments
// adapt to this business, not arbitrary cutoffs), then maps the R/F scores onto
// the well-known 11-cell segment matrix collapsed into named, actionable groups.
//
// Why this is NOT the churn module: churn outputs a single risk probability per
// customer. RFM buckets the WHOLE base into marketing segments (Champions, Loyal,
// At Risk, ...) each with a different play. Different output, different use.

const DAY = 86400000;
function round(n, dp = 2) { const f = Math.pow(10, dp); return Math.round((Number(n) || 0) * f) / f; }

// Quintile rank (1..5) of value v within a sorted ascending array.
function quintile(sortedAsc, v, invert = false) {
  if (!sortedAsc.length) return 3;
  // position = share of values <= v
  let lo = 0, hi = sortedAsc.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (sortedAsc[mid] <= v) lo = mid + 1; else hi = mid; }
  const pctl = lo / sortedAsc.length; // 0..1
  let score = Math.min(5, Math.max(1, Math.ceil(pctl * 5)));
  // For recency, a SMALLER number of days = better, so invert.
  if (invert) score = 6 - score;
  return score;
}

// Map R (1-5) and F (1-5) to a named segment (standard RFM grid).
function segmentFor(r, f) {
  if (r >= 4 && f >= 4) return 'Champions';
  if (r >= 3 && f >= 3) return 'Loyal';
  if (r >= 4 && f <= 2) return 'New';
  if (r >= 3 && f <= 2) return 'Potential';
  if (r === 3 && f === 3) return 'Needs Attention';
  if (r <= 2 && f >= 4) return "Can't Lose";
  if (r <= 2 && f === 3) return 'At Risk';
  if (r <= 2 && f === 2) return 'Hibernating';
  return 'Lost';
}

const PLAYBOOK = {
  'Champions': 'Reward them. Early access, referrals, VIP perks. Your best advocates.',
  'Loyal': 'Upsell + ask for reviews. Keep them feeling valued.',
  'Potential': 'Nudge to a second purchase with a targeted offer.',
  'New': 'Onboard well. Strong welcome + fast follow-up to build the habit.',
  'Needs Attention': 'Re-engage with a limited-time offer before they slip.',
  'At Risk': 'Win-back: personalised message + incentive. Acting now matters.',
  "Can't Lose": 'High-value but going quiet. Call/personal outreach, real incentive.',
  'Hibernating': 'Low-cost reactivation campaign; deprioritise spend.',
  'Lost': 'Cheap broadcast only, or let go. Don\u2019t over-invest.',
};

function analyze(customers, opts = {}) {
  const now = opts.now || Date.now();
  const rows = customers.filter((c) => c && c.phone).map((c) => {
    const recencyDays = c.lastContact ? Math.max(0, (now - new Date(c.lastContact).getTime()) / DAY) : 9999;
    return { phone: c.phone, name: c.name || '', recencyDays, frequency: Number(c.totalOrders || 0), monetary: Number(c.totalSpent || 0) };
  });
  if (!rows.length) return { segments: [], scored: [], summary: { customers: 0 } };

  const recSorted = rows.map((r) => r.recencyDays).sort((a, b) => a - b);
  const freqSorted = rows.map((r) => r.frequency).sort((a, b) => a - b);
  const monSorted = rows.map((r) => r.monetary).sort((a, b) => a - b);

  const scored = rows.map((r) => {
    const R = quintile(recSorted, r.recencyDays, true); // invert: fewer days = higher
    const F = quintile(freqSorted, r.frequency);
    const M = quintile(monSorted, r.monetary);
    return { ...r, R, F, M, rfm: `${R}${F}${M}`, segment: segmentFor(R, F) };
  });

  // Roll up by segment.
  const map = {};
  for (const s of scored) {
    if (!map[s.segment]) map[s.segment] = { segment: s.segment, customers: 0, revenue: 0, avgR: 0, avgF: 0, avgM: 0 };
    const m = map[s.segment];
    m.customers += 1; m.revenue += s.monetary; m.avgR += s.R; m.avgF += s.F; m.avgM += s.M;
  }
  const totalRevenue = scored.reduce((a, s) => a + s.monetary, 0);
  const totalCustomers = scored.length;
  const segments = Object.values(map).map((m) => ({
    segment: m.segment,
    customers: m.customers,
    revenue: round(m.revenue),
    customerSharePct: round((m.customers / totalCustomers) * 100),
    revenueSharePct: totalRevenue > 0 ? round((m.revenue / totalRevenue) * 100) : 0,
    avgScores: { R: round(m.avgR / m.customers, 1), F: round(m.avgF / m.customers, 1), M: round(m.avgM / m.customers, 1) },
    action: PLAYBOOK[m.segment] || '',
  })).sort((a, b) => b.revenue - a.revenue);

  return {
    summary: { customers: totalCustomers, totalRevenue: round(totalRevenue), segments: segments.length },
    segments,
    scored,
  };
}

module.exports = { analyze, quintile, segmentFor, PLAYBOOK, round };
