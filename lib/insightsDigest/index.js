// lib/insightsDigest/index.js
// Rolls the seven adapter outputs into one digest, derives a few headline KPIs,
// and writes a short plain-language narrative + a prioritised action list. This
// is the single object the command-center page and the report exporter consume.

const adapters = require('./adapters');

function money(n) { return 'PKR ' + Number(n || 0).toLocaleString(); }

// Build the prioritised "what should the founder do today" list from signals.
function buildActions(d) {
  const actions = [];

  if (d.alerts.available && d.alerts.critical > 0) {
    actions.push({ priority: 'critical', text: `${d.alerts.critical} critical alert(s) — check the Alerts page first.` });
  }
  if (d.churn.available && d.churn.highRisk > 0) {
    actions.push({ priority: 'high', text: `${d.churn.highRisk} customers at high churn risk (${money(d.churn.revenueAtRisk)} at risk). Run a win-back.` });
  }
  if (d.reEngagement.available && d.reEngagement.targetedToday > 0) {
    actions.push({ priority: 'high', text: `${d.reEngagement.targetedToday} win-back targets ready (${money(d.reEngagement.revenueAtRiskTargeted)}). Review & send.` });
  }
  if (d.experiments.available && d.experiments.decided > 0) {
    actions.push({ priority: 'medium', text: `${d.experiments.decided} A/B test(s) have a winner — promote the winning message.` });
  }
  if (d.cohorts.available && d.cohorts.m1RetentionTrendPct != null && d.cohorts.m1RetentionTrendPct < 0) {
    actions.push({ priority: 'medium', text: `Newer cohorts retain ${Math.abs(d.cohorts.m1RetentionTrendPct)}% worse than older — look at onboarding.` });
  }
  if (d.alerts.available && d.alerts.warning > 0) {
    actions.push({ priority: 'medium', text: `${d.alerts.warning} warning alert(s) worth a look.` });
  }
  if (!actions.length) actions.push({ priority: 'low', text: 'Nothing urgent. Numbers look steady — keep shipping.' });
  return actions;
}

function buildNarrative(d) {
  const bits = [];
  if (d.analytics.available) {
    const g = d.analytics.wowGrowthPct;
    bits.push(`Revenue ${money(d.analytics.revenue)} lifetime` + (g != null ? `, ${g >= 0 ? 'up' : 'down'} ${Math.abs(g)}% WoW` : '') + `.`);
  }
  if (d.forecast.available) {
    bits.push(`Next 30 days projected ${money(d.forecast.next30Revenue)} (${money(d.forecast.next30Low)}–${money(d.forecast.next30High)})` + (d.forecast.projectedGrowthPct != null ? `, ${d.forecast.projectedGrowthPct >= 0 ? '+' : ''}${d.forecast.projectedGrowthPct}% vs last 30d` : '') + `.`);
  }
  if (d.churn.available) {
    bits.push(`Churn risk ${d.churn.predictedChurnRatePct}% with ${money(d.churn.revenueAtRisk)} at risk.`);
  }
  if (d.attribution.available && d.attribution.topOpener && d.attribution.topCloser) {
    bits.push(`${d.attribution.topOpener} opens deals, ${d.attribution.topCloser} closes them.`);
  }
  return bits.join(' ') || 'Not enough data yet — run the analytics batches on PC #2.';
}

function buildDigest(storeId = 'default_store', now = Date.now()) {
  const sections = {
    analytics: adapters.analytics(storeId),
    forecast: adapters.forecast(storeId),
    churn: adapters.churn(storeId),
    reEngagement: adapters.reEngagement(storeId),
    experiments: adapters.experiments(storeId),
    attribution: adapters.attribution(storeId),
    cohorts: adapters.cohorts(storeId),
    alerts: adapters.alerts(storeId),
  };

  const availableCount = Object.values(sections).filter((s) => s.available).length;

  return {
    storeId,
    generatedAt: new Date(now).toISOString(),
    modulesAvailable: availableCount,
    modulesTotal: Object.keys(sections).length,
    headline: {
      revenue: sections.analytics.available ? sections.analytics.revenue : null,
      mrr: sections.analytics.available ? sections.analytics.mrr : null,
      next30Revenue: sections.forecast.available ? sections.forecast.next30Revenue : null,
      revenueAtRisk: sections.churn.available ? sections.churn.revenueAtRisk : null,
      openAlerts: sections.alerts.available ? sections.alerts.open : null,
    },
    narrative: buildNarrative(sections),
    actions: buildActions(sections),
    sections,
  };
}

function buildAllDigest(now = Date.now()) {
  let ids = ['default_store'];
  try { ids = require('../analyticsInsights/dataSources').listStoreIds(); } catch {}
  const stores = ids.map((id) => buildDigest(id, now));
  return { generatedAt: new Date(now).toISOString(), stores: ids, perStore: stores, primary: stores.find((s) => s.storeId === 'default_store') || stores[0] || null };
}

module.exports = { buildDigest, buildAllDigest };
