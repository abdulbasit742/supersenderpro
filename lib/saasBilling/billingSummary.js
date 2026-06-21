'use strict';


/**
    * SaaS Billing — tenant billing summary + admin usage overview (preview). Masks PII.
    */


const subscription = require('./subscriptionModel');
const usageMeter = require('./usageMeter');
const catalog = require('./planCatalog');
const redactor = require('./redactor');


function tenantSummary(tenantId) {
  const sub = subscription.getForTenant(tenantId);
    const plan = catalog.get(sub.planId);
    const usage = usageMeter.usage(tenantId);
    const overLimit = usage.meters.filter(function (m) { return m.overLimit; }).map(function (m) { return m.meter; });
    const nearLimit = usage.meters.filter(function (m) { return !m.unlimited && m.percentUsed >= 80 && !m.overLimit;
}).map(function (m) { return m.meter; });
  return redactor.redact({
      ok: true, dryRun: true, livePayment: false,
      tenantId: sub.tenantId,
    plan: { id: plan.id, name: plan.name, pricePreview: plan.pricePreview, currency: plan.currency, billingCycle:
plan.billingCycle },
      status: sub.status,
      renewalDatePreview: sub.renewalDatePreview,
      meters: usage.meters,
      overLimit: overLimit,
      nearLimit: nearLimit,
      warnings: overLimit.length ? ['Over limit on: ' + overLimit.join(', ') + ' (preview).'] : (nearLimit.length ? ['Near limit on: ' + nearLimit.join(', ') + ' (preview).'] : []),
  });
}

// Admin overview across all tenants (preview, masked).
function adminOverview() {
    const subs = subscription.list();
    const byPlan = {};
    subs.forEach(function (s) { byPlan[s.planId] = (byPlan[s.planId] || 0) + 1; });
    const overLimitTenants = subs.filter(function (s) {
      const plan = catalog.get(s.planId) || { limits: {} };
      return catalog.METERS.some(function (m) { const lim = plan.limits[m]; return lim >= 0 && (s.usage[m] || 0) > lim; });
    }).length;
    return { ok: true, dryRun: true, tenants: subs.length, byPlan: byPlan, overLimitTenants: overLimitTenants, mrrPreview:
subs.reduce(function (sum, s) { const p = catalog.get(s.planId); return sum + (p ? p.pricePreview : 0); }, 0), note:
'Preview values only. No real billing.' };
}

module.exports = { tenantSummary, adminOverview };
