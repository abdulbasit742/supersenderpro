// lib/anomalies/index.js
// Orchestrator: assemble the daily metric series the detector needs (reusing the
// analytics + forecast series builders and the CRM log), score the latest day
// for each metric, apply the rule layer, and persist deduped alerts.
//
// Reuses existing modules; rebuilds nothing. If a source module is missing the
// corresponding metric is simply skipped (never throws).

const detector = require('./detector');
const { METRICS, toAlert } = require('./rules');
const store = require('./alertStore');

let forecasting = null; try { forecasting = require('../forecasting'); } catch {}
let storeCRM = null; try { storeCRM = require('../storeCRM'); } catch {}
let churnModel = null; try { churnModel = require('../analyticsInsights/churnModel'); } catch {}

const DAY = 86400000;
function dayKey(ts) { return new Date(ts).toISOString().slice(0, 10); }

// Build the per-metric daily series for a store. Revenue + orders come from the
// forecast series builder (already gap-filled); newCustomers + failedSends are
// derived from the CRM log. churnRisk is a single current reading (no series),
// handled separately below.
function buildSeries(storeId, now) {
  const series = { revenue: [], orders: [], newCustomers: [], failedSends: [] };
  if (forecasting) {
    try {
      const s = forecasting.buildSeries(storeId, now);
      series.revenue = s.revenue || [];
      series.orders = s.orders || [];
    } catch { /* skip */ }
  }
  if (storeCRM) {
    const customers = storeCRM.getAllCustomers(storeId) || [];
    const newByDay = {};
    const failByDay = {};
    for (const c of customers) {
      if (c.firstContact) {
        const k = dayKey(c.firstContact);
        newByDay[k] = (newByDay[k] || 0) + 1;
      }
      const interactions = storeCRM.getCustomerInteractions(storeId, c.phone, 200) || [];
      for (const i of interactions) {
        if (!i.ts) continue;
        if (i.type === 'send_failed' || i.type === 'failed' || i.status === 'failed') {
          const k = dayKey(i.ts);
          failByDay[k] = (failByDay[k] || 0) + 1;
        }
      }
    }
    // Gap-fill the derived series across the same span as revenue.
    const span = series.revenue.length ? series.revenue.map((p) => p.date) : last30Keys(now);
    series.newCustomers = span.map((d) => ({ date: d, value: newByDay[d] || 0 }));
    series.failedSends = span.map((d) => ({ date: d, value: failByDay[d] || 0 }));
  }
  return series;
}

function last30Keys(now) {
  const out = [];
  for (let i = 29; i >= 0; i--) out.push(dayKey(now - i * DAY));
  return out;
}

function scan(storeId = 'default_store', now = Date.now()) {
  const series = buildSeries(storeId, now);
  const found = [];

  for (const metricKey of ['revenue', 'orders', 'newCustomers', 'failedSends']) {
    const cfg = METRICS[metricKey];
    const s = series[metricKey] || [];
    if (s.length < 11) continue;
    const score = detector.scoreLatest(s, { window: 30, minHistory: 10 });
    const alert = score ? toAlert(metricKey, { ...score, threshold: cfg.threshold }) : null;
    if (alert) found.push(alert);
  }

  // churnRisk: compare today's at-risk count to a simple recent expectation.
  if (churnModel && storeCRM) {
    try {
      const customers = storeCRM.getAllCustomers(storeId) || [];
      const scores = churnModel.buildScores(customers, now);
      const atRisk = scores.bands ? scores.bands.high : 0;
      // Build a pseudo-series: treat high-risk count vs cohort size expectation.
      // With no historical churn series we alert only on an extreme absolute share.
      const total = scores.customersScored || customers.length || 1;
      const sharePct = (atRisk / total) * 100;
      if (sharePct >= 25 && atRisk >= 5) {
        found.push({
          metric: 'churnRisk', label: 'Customers at risk', date: dayKey(now),
          value: atRisk, baseline: Math.round(total * 0.1), z: null,
          direction: 'spike', deltaPct: null,
          severity: sharePct >= 40 ? 'critical' : 'warning', good: false,
          headline: `${atRisk} customers (${Math.round(sharePct)}% of base) are now high churn-risk`,
        });
      }
    } catch { /* skip */ }
  }

  const fresh = store.addNew(storeId, found);
  return { scanned: found.length, fresh, all: found };
}

function listAlerts(storeId, opts) { return store.list(storeId, opts); }
function acknowledge(key) { return store.acknowledge(key); }

module.exports = { scan, listAlerts, acknowledge, buildSeries };
