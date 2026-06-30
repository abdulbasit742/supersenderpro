'use strict';
/**
 * middleware/enforcePlan.js - gate a route by a plan metric/quota.
 * Default warn-only (logs + header) so enabling it can't accidentally break flows;
 * set BILLING_ENFORCE=block to actually 402 when over quota.
 * Requires req.tenantId (set by auth middleware).
 */
const billing = require('../lib/billing');
const MODE = (process.env.BILLING_ENFORCE || 'warn').toLowerCase(); // warn | block

function enforcePlan(metric, wouldAdd = 1) {
  return (req, res, next) => {
    (async () => {
      try {
        const tenantId = req.tenantId || (req.body && req.body.tenantId) || req.query.tenantId;
        if (!tenantId) return next();
        const q = await billing.checkQuota(tenantId, metric, wouldAdd);
        res.set('X-Quota-Remaining', String(q.remaining == null ? -1 : q.remaining));
        if (!q.allowed) {
          if (MODE === 'block') return res.status(402).json({ success: false, error: 'plan quota exceeded for ' + metric, quota: q, fix: 'upgrade plan' });
          console.warn('[Billing] quota exceeded (warn-only) tenant=' + tenantId + ' metric=' + metric, q);
        }
        next();
      } catch (e) { console.error('[Billing] enforce error:', e.message); next(); }
    })();
  };
}

module.exports = { enforcePlan, MODE };
