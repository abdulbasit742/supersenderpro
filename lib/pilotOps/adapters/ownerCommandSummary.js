'use strict';

/**
 * Pilot Ops — Owner Command summary builder. Returns owner-facing draft data.
    * Does NOT rebuild Owner Command. Works even if Owner Command is absent.
    */


const registry = require('../pilotRegistry');
const trialManager = require('../trialManager');
const conversion = require('../conversionAdvisor');
const privacy = require('../privacyGuard');


function build() {
  const pilots = registry.list();
     const needingAction = pilots.filter(function (p) { return ['waiting_admin', 'setup_in_progress',

 'onboarding_started'].indexOf(p.onboardingStatus) !== -1; });
   const expiring = pilots.filter(function (p) { const d = trialManager.daysRemaining(p); return d != null && d <= 3 &&
 p.trialStatus !== 'converted'; });
      const conversionReady = pilots.filter(function (p) { return conversion.advise(p, {}).readyToConvert; });
      const highRisk = pilots.filter(function (p) { return (p.riskScore || 0) >= 60; });
      return privacy.redact({
        dryRun: true,
        pilotsNeedingAction: needingAction.length,
        trialsExpiring: expiring.length,
        conversionReady: conversionReady.length,
        highRisk: highRisk.length,
     items: needingAction.slice(0, 10).map(function (p) { return { business: p.businessName, status: p.onboardingStatus,
 nextAction: p.nextAction }; }),
      });
 }


 module.exports = { build };
