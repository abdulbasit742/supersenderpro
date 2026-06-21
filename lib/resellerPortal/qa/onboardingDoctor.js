'use strict';

/**
    * Reseller Portal QA — onboarding doctor. Combines checklist + readiness score
    * into a focused onboarding verdict. Read-only.
    */


const checklist = require('./partnerOnboardingChecklist');
const scoring = require('./partnerReadinessScoring');


function run() {
     const items = checklist.build();
     const sc = scoring.score(items);
     const blockers = items.filter(function (i) { return i.status === 'blocked'; }).map(function (i) { return i.title; });
     const warnings = items.filter(function (i) { return i.status === 'warning'; }).map(function (i) { return i.title; });
  const nextSteps = items.filter(function (i) { return i.required && i.status !== 'configured' && i.status !==
'verified'; }).map(function (i) { return (i.fixSteps[0] || ('Complete: ' + i.title)); });
  return { dryRun: true, score: sc.score, requiredPercent: sc.requiredPercent, blockers: blockers, warnings: warnings,
nextSteps: nextSteps, checklist: items };
}


module.exports = { run };
