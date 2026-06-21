'use strict';


/**
    * Reseller Portal QA — payout safety. Asserts no real payout is enabled or possible.
    * Reads the existing safetyGuard if present; else falls back to env.
    */

const guard = require('./qaGuard');

function run() {
  const safety = guard.loadPortal('safetyGuard');
     let payoutsDisabled;
     if (safety && typeof safety.allowRealPayouts === 'function') payoutsDisabled = safety.allowRealPayouts() === false;
     else payoutsDisabled = guard.boolEnv('RESELLER_PORTAL_ALLOW_REAL_PAYOUTS', false) === false;

     const blockers = [];
     if (!payoutsDisabled) blockers.push('Real payouts are enabled; must be disabled by default.');
  if (guard.requirePayoutDisabled() && !payoutsDisabled) blockers.push('Policy requires payouts disabled (RESELLER_PORTAL_REQUIRE_PAYOUT_DISABLED=true).');

     // Scan routes file for any payout-execution route (advisory).
     const routeSrc = guard.read('routes/resellerPortalRoutes.js');
     const hasPayoutRoute = /payout|disburse|transfer/i.test(routeSrc) && /\brouter\.(post|put)\b/i.test(routeSrc) &&
/payout/i.test(routeSrc);
  const warnings = [];
     if (hasPayoutRoute) warnings.push('A payout-like route string was found; confirm it is preview-only.');

     return { payoutDisabled: payoutsDisabled, manualReviewRequired: true, blockers: blockers, warnings: warnings };
}

module.exports = { run };
