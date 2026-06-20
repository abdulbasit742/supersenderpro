// lib/publicSaasFunnel/adapters/kpiCommandAdapter.js
// Provides funnel KPIs. If Owner/KPI Command exists it can ingest these; standalone otherwise.

let ownerBriefingPresent = false;
try { require.resolve('../../ownerBriefing'); ownerBriefingPresent = true; } catch { ownerBriefingPresent = false; }

// Compute funnel KPIs from leads/demo/trial collections (all already masked, no PII).
function buildKpis({ leads = [], demoRequests = [], trialRequests = [] } = {}) {
  const total = leads.length;
  const byStatus = {};
  const byPage = {};
  const byPlan = {};
  let hot = 0, qualified = 0;
  for (const l of leads) {
    byStatus[l.status] = (byStatus[l.status] || 0) + 1;
    byPage[l.sourcePage || 'unknown'] = (byPage[l.sourcePage || 'unknown'] || 0) + 1;
    if (l.interestedPlan) byPlan[l.interestedPlan] = (byPlan[l.interestedPlan] || 0) + 1;
    if (l.grade === 'hot' || l.grade === 'priority') hot += 1;
    if (l.status === 'qualified') qualified += 1;
  }
  const demoCount = demoRequests.length;
  const trialCount = trialRequests.length;
  const conversionRate = total > 0 ? Number((((demoCount + trialCount) / total) * 100).toFixed(1)) : 0;

  return {
    type: 'public_funnel_kpis',
    kpiCommandDetected: ownerBriefingPresent,
    totalLeads: total,
    qualifiedLeads: qualified,
    hotLeads: hot,
    demoRequests: demoCount,
    trialRequests: trialCount,
    requestConversionRatePct: conversionRate,
    byStatus,
    bySourcePage: byPage,
    byPlanInterest: byPlan,
    generatedAt: new Date().toISOString(),
  };
}

module.exports = { present: ownerBriefingPresent, buildKpis };
