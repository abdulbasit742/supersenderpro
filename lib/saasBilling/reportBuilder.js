// lib/saasBilling/reportBuilder.js — Privacy-safe billing reports (JSON + Markdown + simple CSV).
// Read-only aggregation. No secrets, no full PII.

const billingStatus = require('./billingStatus');
const tenantPlans = require('./tenantPlans');
const invoiceStore = require('./invoiceStore');
const renewalEngine = require('./renewalEngine');
const upgradeAdvisor = require('./upgradeAdvisor');
const resellerManager = require('./resellerManager');
const quotaChecker = require('./quotaChecker');
const planRegistry = require('./planRegistry');

function monthlyRecurringRevenueDraft() {
  const tenants = tenantPlans.listTenants();
  let mrr = 0;
  const byPlan = {};
  tenants.forEach((t) => {
    const plan = planRegistry.getPlan(t.planId);
    const monthly = plan ? (plan.billingCycle === 'annual' ? (plan.price || 0) / 12 : (plan.price || 0)) : 0;
    mrr += monthly;
    byPlan[t.planId] = (byPlan[t.planId] || 0) + 1;
  });
  return { mrrDraft: Math.round(mrr), tenants: tenants.length, planDistribution: byPlan };
}

function invoicesDue() {
  return invoiceStore.all().filter((i) => ['issued', 'overdue'].includes(i.status))
    .map((i) => ({ invoiceNumber: i.invoiceNumber, tenantId: i.tenantId, amount: i.amount, currency: i.currency, status: i.status, dueAt: i.dueAt }));
}

function usageOverLimits() {
  return tenantPlans.listTenants()
    .map((t) => quotaChecker.checkTenant(t.tenantId))
    .filter((q) => q.overallLevel !== 'ok')
    .map((q) => ({ tenantId: q.tenantId, planId: q.planId, level: q.overallLevel, exceeded: q.exceeded.map((e) => e.limitKey), warnings: q.warnings.map((w) => w.limitKey) }));
}

function upgradeOpportunities() {
  return tenantPlans.listTenants().map((t) => upgradeAdvisor.recommend(t.tenantId)).filter((r) => r.recommend);
}

function all() {
  const events = renewalEngine.scan();
  return {
    generatedAt: new Date().toISOString(),
    mrr: monthlyRecurringRevenueDraft(),
    invoicesDue: invoicesDue(),
    trialsEnding: events.trialsEnding.map((l) => ({ tenantId: l.tenantId, trialEndsAt: l.trialEndsAt })),
    pastDueTenants: [...events.pastDue, ...events.inGrace].map((l) => ({ tenantId: l.tenantId, status: l.status })),
    usageOverLimits: usageOverLimits(),
    upgradeOpportunities: upgradeOpportunities(),
    resellerCommissions: resellerManager.commissionReport(),
  };
}

function toMarkdown(rep = all()) {
  let md = `# SaaS Billing Report\n\nGenerated: ${rep.generatedAt}\n\n`;
  md += `## Revenue (draft)\n- MRR draft: ${rep.mrr.mrrDraft} (${rep.mrr.tenants} tenants)\n- Plan distribution: ${JSON.stringify(rep.mrr.planDistribution)}\n\n`;
  md += `## Invoices Due (${rep.invoicesDue.length})\n`;
  rep.invoicesDue.forEach((i) => { md += `- ${i.invoiceNumber} · ${i.tenantId} · ${i.amount} ${i.currency} · ${i.status}\n`; });
  md += `\n## Trials Ending (${rep.trialsEnding.length})\n`;
  rep.trialsEnding.forEach((t) => { md += `- ${t.tenantId} · ends ${t.trialEndsAt}\n`; });
  md += `\n## Past Due / Grace (${rep.pastDueTenants.length})\n`;
  rep.pastDueTenants.forEach((t) => { md += `- ${t.tenantId} · ${t.status}\n`; });
  md += `\n## Usage Over Limits (${rep.usageOverLimits.length})\n`;
  rep.usageOverLimits.forEach((u) => { md += `- ${u.tenantId} · ${u.level} · exceeded: ${u.exceeded.join(', ') || '-'}\n`; });
  md += `\n## Upgrade Opportunities (${rep.upgradeOpportunities.length})\n`;
  rep.upgradeOpportunities.forEach((u) => { md += `- ${u.tenantId} · ${u.currentPlan} → ${u.suggestedPlan}\n`; });
  return md;
}

// Simple invoices-due CSV (no PII).
function invoicesCsv() {
  const rows = [['invoiceNumber', 'tenantId', 'amount', 'currency', 'status', 'dueAt']];
  invoicesDue().forEach((i) => rows.push([i.invoiceNumber, i.tenantId, i.amount, i.currency, i.status, i.dueAt]));
  return rows.map((r) => r.join(',')).join('\n');
}

module.exports = { all, toMarkdown, invoicesCsv, monthlyRecurringRevenueDraft, invoicesDue, usageOverLimits, upgradeOpportunities };
