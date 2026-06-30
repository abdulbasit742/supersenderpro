// lib/analyticsInsights/churnModel.js
// Transparent RFM-based churn-prediction model. Deliberately dependency-free so
// it runs on the PC #2 batch box without a Python/ML stack. The score is fully
// explainable (no black box) and ships with human-readable reasons.
//
// Upgrade path: when there's enough labelled history, swap scoreCustomer()'s
// hand-tuned logit for coefficients fitted on PES's own churn data. The
// buildScores() contract (and everything downstream) stays identical.

const DAY = 86400000;

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}
function round(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}
function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

function scoreCustomer(c, now, ctx) {
  const recencyDays = c.lastContact
    ? Math.max(0, (now - new Date(c.lastContact).getTime()) / DAY)
    : 999;
  const frequency = Number(c.totalOrders || 0);
  const monetary = Number(c.totalSpent || 0);

  // Recency is the dominant churn signal, centred around ~30 days quiet.
  const recencyZ = (recencyDays - 30) / 25;
  // Frequency + monetary are protective: loyal, high-value customers churn less.
  const freqProtection = Math.log1p(frequency) * 0.8;
  const moneyProtection = ctx.avgMonetary > 0 ? clamp(monetary / ctx.avgMonetary, 0, 3) * 0.5 : 0;

  let logit = 1.1 * recencyZ - freqProtection - moneyProtection - 0.4;

  // Hard signals.
  if (c.status === 'inactive') logit += 1.2;
  if (c.status === 'blocked') logit += 2.5;
  if (frequency === 0) logit += 0.6; // never bought = fragile
  if (c.promoOptIn === false) logit += 0.3;

  const risk = Math.round(sigmoid(logit) * 100);
  const band = risk >= 70 ? 'high' : risk >= 40 ? 'medium' : 'low';

  const reasons = [];
  if (recencyDays >= 60) reasons.push(`No contact in ${Math.round(recencyDays)}d`);
  else if (recencyDays >= 30) reasons.push(`Quiet for ${Math.round(recencyDays)}d`);
  if (frequency === 0) reasons.push('Never purchased');
  if (c.status === 'inactive') reasons.push('Marked inactive');
  if (c.status === 'blocked') reasons.push('Blocked');
  if (frequency >= 3 && band !== 'low') reasons.push('Was a repeat buyer');
  if (c.promoOptIn === false) reasons.push('Opted out of promos');

  return {
    phone: c.phone,
    name: c.name || '',
    channel: c.source || 'unknown',
    tier: c.tier || '',
    recencyDays: Math.round(recencyDays),
    frequency,
    monetary: round(monetary),
    churnRisk: risk,
    band,
    revenueAtRisk: round(monetary),
    reasons,
  };
}

function buildScores(customers, now = Date.now()) {
  const active = customers.filter((c) => c && c.phone);
  const totalMonetary = active.reduce((s, c) => s + Number(c.totalSpent || 0), 0);
  const ctx = { avgMonetary: active.length ? totalMonetary / active.length : 0 };

  const scores = active
    .map((c) => scoreCustomer(c, now, ctx))
    .sort((a, b) => b.churnRisk - a.churnRisk);

  const high = scores.filter((s) => s.band === 'high');
  const medium = scores.filter((s) => s.band === 'medium');
  const low = scores.filter((s) => s.band === 'low');

  // "Save these first": highest revenue-at-risk among medium+high risk.
  const saveList = scores
    .filter((s) => s.band !== 'low')
    .sort((a, b) => b.revenueAtRisk - a.revenueAtRisk || b.churnRisk - a.churnRisk)
    .slice(0, 25);

  return {
    customersScored: scores.length,
    predictedChurnRatePct: scores.length ? round((high.length / scores.length) * 100) : 0,
    revenueAtRisk: round(high.reduce((s, x) => s + x.revenueAtRisk, 0)),
    bands: { high: high.length, medium: medium.length, low: low.length },
    saveList,
    topRisk: scores.slice(0, 25),
  };
}

// Subscription churn: expired or deactivated subscriptions.
function subscriptionChurn(subs, now = Date.now()) {
  let active = 0;
  let churned = 0;
  for (const u of Object.values(subs.users || {})) {
    if (!u) continue;
    const isActive = u.active !== false && (!u.expiresAt || new Date(u.expiresAt).getTime() > now);
    if (isActive) active += 1;
    else churned += 1;
  }
  const total = active + churned;
  return { active, churned, churnRatePct: total ? round((churned / total) * 100) : 0 };
}

module.exports = { buildScores, subscriptionChurn, scoreCustomer };
