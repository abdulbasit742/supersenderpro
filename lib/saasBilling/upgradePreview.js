'use strict';

/**
    * SaaS Billing — upgrade preview. Compares current vs target plan and lists changes.
    * livePayment:false always; nothing is charged.
    */

const subscription = require('./subscriptionModel');
const catalog = require('./planCatalog');


function preview(tenantId, targetPlanId) {
     const sub = subscription.getForTenant(tenantId);
     const current = catalog.get(sub.planId);
     const target = catalog.get(targetPlanId);
     if (!target) return { ok: false, dryRun: true, livePayment: false, error: 'unknown_target_plan', plans: catalog.order()
};

     const changes = [];
     catalog.METERS.forEach(function (m) {
         const from = current.limits[m]; const to = target.limits[m];
         if (from !== to) changes.push({ type: 'limit', meter: m, from: from === -1 ? 'unlimited' : from, to: to === -1 ?
'unlimited' : to });
  });
  const gainedFeatures = (target.features || []).filter(function (f) { return (current.features || []).indexOf(f) === -1;
});
  const lostFeatures = (current.features || []).filter(function (f) { return (target.features || []).indexOf(f) === -1;
});
     gainedFeatures.forEach(function (f) { changes.push({ type: 'feature_gained', feature: f }); });
     lostFeatures.forEach(function (f) { changes.push({ type: 'feature_lost', feature: f }); });
  if (current.pricePreview !== target.pricePreview) changes.push({ type: 'price', from: current.pricePreview, to:
target.pricePreview, currency: target.currency });

     const warnings = ['Preview only. No payment taken, no plan actually changed.'];
     const blockers = [];
     if (lostFeatures.length) warnings.push('Downgrade would lose features: ' + lostFeatures.join(', ') + '.');
     // Downgrade with current usage over the target limit is flagged.
     catalog.METERS.forEach(function (m) { const to = target.limits[m]; const used = sub.usage[m] || 0; if (to >= 0 && used
> to) blockers.push('Current ' + m + ' usage (' + used + ') exceeds target limit (' + to + ').'); });

  return { ok: true, dryRun: true, livePayment: false, currentPlan: current.id, targetPlan: target.id, changesPreview:
changes, warnings: warnings, blockers: blockers };
}

module.exports = { preview };
