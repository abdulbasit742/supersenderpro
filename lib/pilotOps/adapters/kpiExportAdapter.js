'use strict';


/**
 * Pilot Ops — KPI export. Returns pilot/conversion metrics for KPI Command.
    * Read-only aggregation over the pilot registry + feedback store.
    */


const registry = require('../pilotRegistry');
const feedback = require('../feedbackStore');


function metrics() {
  const pilots = registry.list();
     const total = pilots.length;
     const converted = pilots.filter(function (p) { return p.onboardingStatus === 'converted_paid'; }).length;
  const active = pilots.filter(function (p) { return ['active', 'active_dry_run'].indexOf(p.trialStatus) !== -1;
}).length;
  const completedOnboarding = pilots.filter(function (p) { return ['pilot_active', 'pilot_success', 'upgrade_ready',
'converted_paid'].indexOf(p.onboardingStatus) !== -1; }).length;
     return {
       dryRun: true,
       pilots: total,
       activeTrials: active,
       conversions: converted,
       conversionRate: total ? Math.round((converted / total) * 100) : 0,
       onboardingCompletionRate: total ? Math.round((completedOnboarding / total) * 100) : 0,
       feedbackCount: feedback.list().length,
       upgradeReady: pilots.filter(function (p) { return p.onboardingStatus === 'upgrade_ready'; }).length,
     };
}


module.exports = { metrics };
