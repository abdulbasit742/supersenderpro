// lib/saasBilling/usageRollups.js — Aggregate usage events into period buckets.
// Pure aggregation. Periods: daily, weekly, monthly, billing_cycle.

function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function startOfWeek(d) { const x = startOfDay(d); const day = x.getDay(); x.setDate(x.getDate() - day); return x; }
function startOfMonth(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(1); return x; }

function periodStart(period, ref = new Date()) {
  switch (period) {
    case 'daily': return startOfDay(ref);
    case 'weekly': return startOfWeek(ref);
    case 'monthly': return startOfMonth(ref);
    case 'billing_cycle': return startOfMonth(ref); // default cycle = calendar month
    default: return startOfMonth(ref);
  }
}

// Sum amounts per metric for events within the given period.
function rollup(events, period = 'monthly', ref = new Date()) {
  const since = periodStart(period, ref).getTime();
  const totals = {};
  let counted = 0;
  for (const e of events) {
    const t = Date.parse(e.createdAt);
    if (Number.isFinite(t) && t < since) continue;
    const m = e.metric;
    totals[m] = (totals[m] || 0) + Number(e.amount || 0);
    counted += 1;
  }
  return { period, since: new Date(since).toISOString(), events: counted, totals };
}

function allPeriods(events, ref = new Date()) {
  return {
    daily: rollup(events, 'daily', ref),
    weekly: rollup(events, 'weekly', ref),
    monthly: rollup(events, 'monthly', ref),
    billing_cycle: rollup(events, 'billing_cycle', ref),
  };
}

module.exports = { rollup, allPeriods, periodStart };
