'use strict';

/**
 * SaaS Billing — quota/limit check (preview). Never blocks production; returns an
    * allowedPreview decision only.
    */


const subscription = require('./subscriptionModel');
const catalog = require('./planCatalog');


function checkPreview(tenantId, meter, requested) {
  if (catalog.METERS.indexOf(meter) === -1) return { ok: false, dryRun: true, error: 'unknown_meter', meters:
catalog.METERS };
  const sub = subscription.getForTenant(tenantId);
     const used = sub.usage[meter] || 0;
     const limit = sub.limits[meter];
     const add = Number(requested) || 0;
     const unlimited = limit === -1;
     const projected = used + add;
     const overLimit = !unlimited && limit >= 0 && projected > limit;
     const warnings = [], blockers = [];
     if (!unlimited && limit >= 0) {
         const pct = limit ? Math.round((projected / limit) * 100) : 100;
         if (pct >= 80 && pct < 100) warnings.push('Approaching limit (' + pct + '% after this).');
         if (overLimit) warnings.push('Would exceed plan limit; upgrade recommended (preview).');
     }
  return { ok: true, dryRun: true, tenantId: sub.tenantId, meter: meter, used: used, limit: limit, requested: add,
projected: projected, unlimited: unlimited, allowedPreview: unlimited || !overLimit, overLimitPreview: overLimit,
warnings: warnings, blockers: blockers };
}

module.exports = { checkPreview };
