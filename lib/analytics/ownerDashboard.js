'use strict';
/**
 * ownerDashboard.js — Analytics Feature #1: the founder's single-screen overview.
 *
 * One call assembles the numbers that matter across every department built so far:
 *   - Leads (top of funnel)        -> lead count, sources, conversion
 *   - CRM / Customer 360           -> customers, total spent
 *   - Sales pipeline               -> open value, weighted forecast, win rate
 *   - Marketing analytics          -> sends, opens, clicks, conversions
 *   - Payments / subscriptions     -> revenue, active subs, past-due (churn risk)
 *
 * It OWNS NO DATA. Each source is an injected provider (a function returning that department's
 * summary), so the dashboard works with whatever is wired and silently skips what isn't. This keeps
 * it decoupled and impossible to break when a department is absent.
 */

const providers = {
  leads: null,        // () => ({ total, bySource, byStatus, conversionRatePct })
  crm: null,          // () => ({ customers, totalSpent })
  pipeline: null,     // () => ({ openPipelineValue, weightedForecast, winRatePct, wonValue })
  marketing: null,    // () => ({ sent, delivered, read, click, conversion, revenue })
  payments: null      // () => ({ revenue, activeSubs, pastDueSubs, lifetimePaid })
};
function configure(p = {}) {
  for (const k of Object.keys(providers)) if (typeof p[k] === 'function') providers[k] = p[k];
  return Object.keys(providers).filter(k => providers[k]);
}

function safe(fn, fallback) {
  try { const v = fn ? fn() : null; return v == null ? fallback : v; }
  catch { return fallback; }
}
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const pct = (part, whole) => whole ? Math.round((part / whole) * 1000) / 10 : 0;

/**
 * Build the owner dashboard. Returns a structured KPI object plus a flat `headline` for quick
 * display (the 4-5 numbers a founder glances at).
 */
function getDashboard() {
  const leads = safe(providers.leads, { total: 0, bySource: {}, byStatus: {}, conversionRatePct: 0 });
  const crm = safe(providers.crm, { customers: 0, totalSpent: 0 });
  const pipeline = safe(providers.pipeline, { openPipelineValue: 0, weightedForecast: 0, winRatePct: 0, wonValue: 0 });
  const marketing = safe(providers.marketing, { sent: 0, delivered: 0, read: 0, click: 0, conversion: 0, revenue: 0 });
  const payments = safe(providers.payments, { revenue: 0, activeSubs: 0, pastDueSubs: 0, lifetimePaid: 0 });

  // Cross-department funnel: leads -> customers
  const funnel = {
    leads: leads.total || 0,
    customers: crm.customers || 0,
    leadToCustomerPct: pct(crm.customers || 0, leads.total || 0)
  };

  // Marketing engagement rates
  const engagement = {
    sent: marketing.sent || 0,
    openRatePct: pct(marketing.read || 0, marketing.delivered || marketing.sent || 0),
    clickRatePct: pct(marketing.click || 0, marketing.read || marketing.delivered || marketing.sent || 0),
    conversions: marketing.conversion || 0
  };

  // Revenue picture
  const totalRevenue = round2((payments.revenue || 0) || (payments.lifetimePaid || 0) || (crm.totalSpent || 0));
  const revenue = {
    total: totalRevenue,
    fromMarketing: round2(marketing.revenue || 0),
    pipelineForecast: round2(pipeline.weightedForecast || 0),
    wonValue: round2(pipeline.wonValue || 0)
  };

  // Churn / health signals
  const health = {
    activeSubscriptions: payments.activeSubs || 0,
    pastDueSubscriptions: payments.pastDueSubs || 0,
    churnRiskPct: pct(payments.pastDueSubs || 0, (payments.activeSubs || 0) + (payments.pastDueSubs || 0)),
    winRatePct: pipeline.winRatePct || 0
  };

  const headline = {
    revenue: revenue.total,
    leads: funnel.leads,
    customers: funnel.customers,
    activeSubscriptions: health.activeSubscriptions,
    weightedForecast: revenue.pipelineForecast
  };

  return {
    generatedAt: new Date().toISOString(),
    headline,
    funnel,
    engagement,
    revenue,
    health,
    sources: {
      leadsBySource: leads.bySource || {},
      leadsByStatus: leads.byStatus || {}
    }
  };
}

module.exports = { configure, getDashboard };
