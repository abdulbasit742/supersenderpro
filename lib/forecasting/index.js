// lib/forecasting/index.js
// Orchestrator: build a continuous daily revenue (and orders) series from the
// CRM order log, run the forecast engine, and shape a snapshot for the
// dashboard + batch. Reads storeCRM only; rebuilds nothing.

const engine = require('./forecastEngine');

let storeCRM = null;
try { storeCRM = require('../storeCRM'); } catch { /* optional */ }

const DAY = 86400000;
const HISTORY_DAYS = Number(process.env.FORECAST_HISTORY_DAYS || 120);

function dayKey(ts) { return new Date(ts).toISOString().slice(0, 10); }

// Build a continuous (gap-filled) daily series of revenue + orders.
function buildSeries(storeId, now = Date.now()) {
  if (!storeCRM) return { revenue: [], orders: [] };
  const customers = storeCRM.getAllCustomers(storeId) || [];
  const revByDay = {};
  const ordByDay = {};
  const minTs = now - HISTORY_DAYS * DAY;

  for (const c of customers) {
    if (!c.phone) continue;
    const interactions = storeCRM.getCustomerInteractions(storeId, c.phone, 500) || [];
    for (const i of interactions) {
      if (i.type !== 'order' || !i.ts) continue;
      const t = new Date(i.ts).getTime();
      if (t < minTs) continue;
      const k = dayKey(i.ts);
      revByDay[k] = (revByDay[k] || 0) + Number(i.amount || 0);
      ordByDay[k] = (ordByDay[k] || 0) + 1;
    }
  }

  // Fill every day from first activity (or HISTORY_DAYS ago) to today with 0s,
  // so the smoother sees a continuous series.
  const keys = Object.keys(revByDay).sort();
  const startTs = keys.length ? new Date(keys[0] + 'T00:00:00Z').getTime() : minTs;
  const revenue = [];
  const orders = [];
  for (let t = startTs; t <= now; t += DAY) {
    const k = dayKey(t);
    revenue.push({ date: k, value: round(revByDay[k] || 0) });
    orders.push({ date: k, value: ordByDay[k] || 0 });
  }
  return { revenue, orders };
}

function round(n) { return Math.round((Number(n) || 0) * 100) / 100; }

function buildSnapshot(storeId = 'default_store', horizon = 30, now = Date.now()) {
  const { revenue, orders } = buildSeries(storeId, now);
  const revFc = engine.forecast(revenue, horizon);
  const ordFc = engine.forecast(orders, horizon);
  const revBt = engine.backtest(revenue);

  const next30Revenue = round(revFc.points.reduce((s, p) => s + p.forecast, 0));
  const next30Lower = round(revFc.points.reduce((s, p) => s + p.lower, 0));
  const next30Upper = round(revFc.points.reduce((s, p) => s + p.upper, 0));
  const next30Orders = Math.round(ordFc.points.reduce((s, p) => s + p.forecast, 0));

  // Trailing 30d actual for a like-for-like comparison.
  const trailing30 = round(revenue.slice(-30).reduce((s, p) => s + p.value, 0));
  const projectedGrowthPct = trailing30 > 0 ? round(((next30Revenue - trailing30) / trailing30) * 100) : null;

  return {
    storeId,
    generatedAt: new Date(now).toISOString(),
    horizon,
    historyDays: revenue.length,
    summary: {
      next30Revenue, next30RevenueLow: next30Lower, next30RevenueHigh: next30Upper,
      next30Orders,
      trailing30Revenue: trailing30,
      projectedGrowthPct,
      backtestAccuracyPct: revBt.ok ? revBt.accuracyPct : null,
      seasonality: revFc.seasonality, // Sun..Sat multipliers
    },
    actuals: { revenue: revenue.slice(-60), orders: orders.slice(-60) },
    forecast: { revenue: revFc.points, orders: ordFc.points },
    backtest: revBt,
  };
}

function buildAllSnapshot(horizon = 30, now = Date.now()) {
  let ids = ['default_store'];
  try { ids = require('../analyticsInsights/dataSources').listStoreIds(); } catch { /* default */ }
  const stores = ids.map((id) => buildSnapshot(id, horizon, now));
  return { generatedAt: new Date(now).toISOString(), stores: ids, perStore: stores, primary: stores.find((s) => s.storeId === 'default_store') || stores[0] || null };
}

module.exports = { buildSnapshot, buildAllSnapshot, buildSeries };
