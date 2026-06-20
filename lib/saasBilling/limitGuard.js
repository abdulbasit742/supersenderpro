// lib/saasBilling/limitGuard.js — Thin helper for inline usage-limit checks in module code.
// Call before performing a metered action; it records intent and returns a warn-only decision.
// Existing modules can adopt this incrementally — it is never required.

const featureGate = require('./featureGate');
const usageMeter = require('./usageMeter');

// Check + (optionally) record a metered action in one call.
function guard({ tenantId, feature, metric, amount = 1, sourceModule = 'unknown', sourceId = null, recordOnAllow = true } = {}) {
  const decision = featureGate.check({ tenantId, feature, metric, increment: amount, action: `metric:${metric}` });
  let event = null;
  if (recordOnAllow && (decision.allowed || decision.warnOnly)) {
    event = usageMeter.record({ tenantId, feature, metric, amount, sourceModule, sourceId });
  }
  return { decision, event };
}

module.exports = { guard };
