// lib/cohorts/cohortEngine.js
// Cohort retention + LTV math. Pure functions over already-loaded customer
// records + their order interactions, so it's trivially testable and cheap to
// run in the PC #2 overnight window.
//
// A cohort = all customers whose FIRST order happened in a given calendar month.
// Retention[m] = share of the cohort that placed an order in month (cohortMonth + m).
// By definition retention at month 0 is 100% (everyone ordered in their first month).
// LTV[m] = cumulative average revenue per cohort member through month m.

const MONTH_KEYS = (ts) => {
  const d = new Date(ts);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

// Whole-month difference between two YYYY-MM keys.
function monthDiff(fromKey, toKey) {
  const [fy, fm] = fromKey.split('-').map(Number);
  const [ty, tm] = toKey.split('-').map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

function round(n, dp = 2) {
  const f = Math.pow(10, dp);
  return Math.round((Number(n) || 0) * f) / f;
}

// orders: [{ phone, ts, amount }] across all customers.
// Returns cohorts keyed by acquisition month with retention + LTV curves.
function buildCohorts(orders, now = Date.now()) {
  // Group orders by phone, oldest first.
  const byPhone = {};
  for (const o of orders) {
    if (!o.phone || !o.ts) continue;
    (byPhone[o.phone] = byPhone[o.phone] || []).push(o);
  }
  for (const phone of Object.keys(byPhone)) {
    byPhone[phone].sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
  }

  // Assign each customer to a cohort = month of their first order.
  const cohortMembers = {}; // cohortKey -> Set(phone)
  const firstMonthOf = {};
  for (const [phone, list] of Object.entries(byPhone)) {
    const cohortKey = MONTH_KEYS(list[0].ts);
    firstMonthOf[phone] = cohortKey;
    (cohortMembers[cohortKey] = cohortMembers[cohortKey] || new Set()).add(phone);
  }

  const nowKey = MONTH_KEYS(now);
  const cohortKeys = Object.keys(cohortMembers).sort();
  const maxMonthsTracked = cohortKeys.length ? monthDiff(cohortKeys[0], nowKey) : 0;

  const cohorts = cohortKeys.map((cohortKey) => {
    const members = cohortMembers[cohortKey];
    const size = members.size;
    const monthsSince = Math.max(0, monthDiff(cohortKey, nowKey));

    // active[m] = Set of members who ordered in month offset m.
    const activeByMonth = {};
    const revenueByMonth = {};
    for (const phone of members) {
      for (const o of byPhone[phone]) {
        const m = monthDiff(cohortKey, MONTH_KEYS(o.ts));
        if (m < 0) continue;
        (activeByMonth[m] = activeByMonth[m] || new Set()).add(phone);
        revenueByMonth[m] = (revenueByMonth[m] || 0) + Number(o.amount || 0);
      }
    }

    const retention = [];
    const ltv = [];
    let cumRevenue = 0;
    for (let m = 0; m <= monthsSince; m++) {
      const activeCount = activeByMonth[m] ? activeByMonth[m].size : 0;
      retention.push({ month: m, active: activeCount, pct: size ? round((activeCount / size) * 100) : 0 });
      cumRevenue += revenueByMonth[m] || 0;
      ltv.push({ month: m, cumRevenue: round(cumRevenue), perMember: size ? round(cumRevenue / size) : 0 });
    }

    const totalRevenue = round(Object.values(revenueByMonth).reduce((a, b) => a + b, 0));
    return {
      cohort: cohortKey,
      size,
      monthsTracked: monthsSince,
      retention,
      ltv,
      totalRevenue,
      ltvPerMember: size ? round(totalRevenue / size) : 0,
      // Headline retention checkpoints (null if cohort isn't old enough yet).
      m1RetentionPct: retention[1] ? retention[1].pct : null,
      m3RetentionPct: retention[3] ? retention[3].pct : null,
    };
  });

  return { cohorts, maxMonthsTracked, nowKey };
}

module.exports = { buildCohorts, MONTH_KEYS, monthDiff, round };
