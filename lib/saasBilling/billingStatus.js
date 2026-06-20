// lib/saasBilling/billingStatus.js — Aggregate, privacy-safe billing snapshot for a
// tenant or the whole account. Read-only. Powers the dashboard overview + adapters.

const tenantPlans = require('./tenantPlans');
const licenseEngine = require('./licenseEngine');
const usageMeter = require('./usageMeter');
const quotaChecker = require('./quotaChecker');
const invoiceStore = require('./invoiceStore');
const { config } = require('./config');
const safetyGuard = require('./safetyGuard');

function tenantStatus(tenantId) {
  const tid = tenantPlans.normalizeTenantId(tenantId);
  const plan = tenantPlans.getTenantPlan(tid);
  const license = licenseEngine.getLicense(tid);
  const quota = quotaChecker.checkTenant(tid);
  const invoices = invoiceStore.forTenant(tid);
  const open = invoices.filter((i) => ['issued', 'overdue'].includes(i.status));
  return {
    tenantId: tid,
    planId: plan.id,
    planName: plan.name,
    licenseStatus: license ? license.status : 'none',
    entitled: license ? license.entitled : true,
    expiresAt: license ? license.expiresAt : null,
    renewalDueAt: license ? license.renewalDueAt : null,
    usageLevel: quota.overallLevel,
    usageWarnings: quota.warnings.length,
    usageExceeded: quota.exceeded.length,
    openInvoices: open.length,
    openInvoiceAmount: open.reduce((s, i) => s + Number(i.amount || 0), 0),
    currency: plan.currency,
  };
}

// Account-wide overview for the dashboard cards.
function overview() {
  const tenants = tenantPlans.listTenants().map((t) => tenantStatus(t.tenantId));
  const invoices = invoiceStore.all();
  const draftRevenue = invoices
    .filter((i) => ['draft', 'issued', 'overdue'].includes(i.status))
    .reduce((s, i) => s + Number(i.amount || 0), 0);

  return {
    generatedAt: new Date().toISOString(),
    safety: safetyGuard.posture(),
    currency: config.defaultCurrency,
    cards: {
      activeTenants: tenants.filter((t) => ['active', 'lifetime'].includes(t.licenseStatus)).length,
      trials: tenants.filter((t) => t.licenseStatus === 'trial').length,
      pastDue: tenants.filter((t) => ['past_due', 'grace', 'expired'].includes(t.licenseStatus)).length,
      monthlyRevenueDraft: draftRevenue,
      invoicesDue: invoices.filter((i) => ['issued', 'overdue'].includes(i.status)).length,
      usageOverLimits: tenants.filter((t) => t.usageExceeded > 0).length,
      usageWarnings: tenants.reduce((s, t) => s + t.usageWarnings, 0),
    },
    tenants,
  };
}

module.exports = { tenantStatus, overview };
