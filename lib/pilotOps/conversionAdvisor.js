'use strict';


/**
    * Pilot Ops — conversion advisor. Combines success + risk + blockers into a
    * recommendation. Returns a dry-run advisory + a follow-up draft handle.
    */


const success = require('./successScoring');
const risk = require('./riskScoring');
const blockerTracker = require('./blockerTracker');


function advise(pilot, signals) {
  const succ = success.compute(pilot, signals);
     const rsk = risk.compute(pilot, signals);
     const blockers = blockerTracker.forPilot(pilot);


     const readyToConvert = succ.score >= 70 && rsk.score < 40 && blockers.filter(function (b) { return b.source ===
'checklist' && b.status === 'blocked'; }).length === 0;


     let suggestedPlan = pilot && pilot.selectedPlan ? pilot.selectedPlan : 'starter';
     if (succ.score >= 85) suggestedPlan = (pilot && pilot.selectedPlan) || 'pro';


     const reasons = [];
     if (succ.score >= 70) reasons.push('High success score (' + succ.score + ').');
     if (rsk.score < 40) reasons.push('Low churn risk (' + rsk.score + ').');
     if (!readyToConvert && succ.score < 70) reasons.push('Success score below 70; keep nurturing.');
     if (!readyToConvert && rsk.score >= 40) reasons.push('Risk too high; resolve blockers first.');


     return {
         readyToConvert: readyToConvert,
         suggestedPlan: suggestedPlan,
         successScore: succ.score,
         riskScore: rsk.score,
         riskLevel: rsk.level,
         reasons: reasons,
         blockers: blockers,
         nextFollowupDraftType: readyToConvert ? 'upgrade_recommendation' : (rsk.level === 'high' ? 'cancellation_save' :
'setup_reminder'),
    dryRun: true,
     };
}


module.exports = { advise };
