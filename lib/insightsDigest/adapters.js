// lib/insightsDigest/adapters.js
// Fault-tolerant read-only adapters over the seven insights modules. The golden
// rule (same as the workspace's KPI-command pattern): every adapter returns
// { available: false } if its module is missing or errors — it NEVER throws and
// NEVER rebuilds another module's logic. The digest just stitches their outputs.

function safe(fn) {
  try {
    const v = fn();
    return v == null ? { available: false } : { available: true, ...v };
  } catch (e) {
    return { available: false, error: e.message };
  }
}

function analytics(storeId) {
  return safe(() => {
    const a = require('../analyticsInsights');
    const snap = a.buildStoreSnapshot(storeId);
    return {
      revenue: snap.headline.revenue,
      mrr: snap.headline.mrr,
      customers: snap.headline.customers,
      orders: snap.headline.orders,
      leadToCustomerPct: snap.headline.leadToCustomerPct,
      wowGrowthPct: snap.revenue ? snap.revenue.wowGrowthPct : null,
      topChannel: (snap.channels && snap.channels[0]) ? snap.channels[0].channel : null,
    };
  });
}

function churn(storeId) {
  return safe(() => {
    const cm = require('../analyticsInsights/churnModel');
    const storeCRM = require('../storeCRM');
    const scores = cm.buildScores(storeCRM.getAllCustomers(storeId) || []);
    return {
      predictedChurnRatePct: scores.predictedChurnRatePct,
      revenueAtRisk: scores.revenueAtRisk,
      highRisk: scores.bands ? scores.bands.high : 0,
      saveListTop: (scores.saveList || []).slice(0, 3).map((s) => ({ name: s.name || s.phone, risk: s.churnRisk, atRisk: s.revenueAtRisk })),
    };
  });
}

function reEngagement(storeId) {
  return safe(() => {
    const re = require('../reEngagement');
    const campaign = re.plan(storeId, {});
    return {
      targetedToday: campaign.summary.targeted,
      revenueAtRiskTargeted: campaign.summary.revenueAtRiskTargeted,
      mode: campaign.mode,
    };
  });
}

function experiments(storeId) {
  return safe(() => {
    const ex = require('../experiments');
    const list = ex.listExperiments(storeId) || [];
    const running = list.filter((e) => e.status === 'running').length;
    const decided = list.filter((e) => e.status === 'decided').length;
    return { total: list.length, running, decided };
  });
}

function attribution(storeId) {
  return safe(() => {
    const at = require('../attribution');
    const snap = at.buildSnapshot(storeId);
    const lt = snap.models.last_touch ? snap.models.last_touch.byChannel : [];
    const ft = snap.models.first_touch ? snap.models.first_touch.byChannel : [];
    return {
      conversions: snap.summary.conversions,
      multiTouchSharePct: snap.summary.multiTouchSharePct,
      topCloser: lt[0] ? lt[0].channel : null,
      topOpener: ft[0] ? ft[0].channel : null,
    };
  });
}

function cohorts(storeId) {
  return safe(() => {
    const co = require('../cohorts');
    const snap = co.buildSnapshot(storeId);
    return {
      cohorts: snap.summary.cohorts,
      avgM1RetentionPct: snap.summary.avgM1RetentionPct,
      m1RetentionTrendPct: snap.summary.m1RetentionTrendPct,
    };
  });
}

function forecast(storeId) {
  return safe(() => {
    const fc = require('../forecasting');
    const snap = fc.buildSnapshot(storeId, 30);
    return {
      next30Revenue: snap.summary.next30Revenue,
      next30Low: snap.summary.next30RevenueLow,
      next30High: snap.summary.next30RevenueHigh,
      projectedGrowthPct: snap.summary.projectedGrowthPct,
      backtestAccuracyPct: snap.summary.backtestAccuracyPct,
    };
  });
}

function alerts(storeId) {
  return safe(() => {
    const al = require('../anomalies');
    const list = al.listAlerts(storeId, { includeAcknowledged: false }) || [];
    const critical = list.filter((a) => a.severity === 'critical').length;
    const warning = list.filter((a) => a.severity === 'warning').length;
    return { open: list.length, critical, warning, top: list.slice(0, 3).map((a) => ({ severity: a.severity, headline: a.headline })) };
  });
}

module.exports = { analytics, churn, reEngagement, experiments, attribution, cohorts, forecast, alerts };
