'use strict';

/**
 * SaaS Billing — usage meter. Record-preview increments the tenant's preview usage * and logs an event. No real metering of production traffic; preview only. */ const subscription = require('./subscriptionModel'); const events = require('./usageEvents'); const catalog = require('./planCatalog'); function recordPreview(tenantId, meter, amount) { if (catalog.METERS.indexOf(meter) === -1) return { ok: false, dryRun: true, error: 'unknown_meter', meters: catalog.METERS }; const amt = Number(amount) || 1;
     const sub = subscription.addUsage(tenantId, meter, amt);
     events.record({ tenantId: tenantId, meter: meter, amount: amt });
  return { ok: true, dryRun: true, tenantId: sub.tenantId, meter: meter, recorded: amt, used: sub.usage[meter], limit:
sub.limits[meter] };
}


function usage(tenantId) {
  const sub = subscription.getForTenant(tenantId);
     const meters = catalog.METERS.map(function (m) {
       const limit = sub.limits[m];
         const used = sub.usage[m] || 0;
         const unlimited = limit === -1;
         const pct = unlimited || !limit ? 0 : Math.round((used / limit) * 100);
         return { meter: m, used: used, limit: limit, unlimited: unlimited, percentUsed: pct, overLimit: !unlimited && limit
>= 0 && used > limit };
  });
     return { ok: true, dryRun: true, tenantId: sub.tenantId, planId: sub.planId, meters: meters };
}


module.exports = { recordPreview, usage };
