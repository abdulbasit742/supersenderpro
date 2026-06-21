'use strict';
/** 0-100 readiness from checklist + journey step coverage. Bands map to demo readiness statuses. */
const checklist = require('./demoAcceptanceChecklist');
const stepRunner = require('./demoStepRunner');
const registry = require('./demoJourneyRegistry');
const safety = require('./demoSafety');
function band(score) {
     if (score <= 30) return 'blocked';
     if (score <= 55) return 'local_demo_ready';
     if (score <= 75) return 'internal_qa_ready';
     if (score <= 88) return 'compliance_review_ready';

    if (score <= 96) return 'production_preview_ready';
    return 'production_launch_ready_with_caution';
}
function run() {
  const cl = checklist.run();
    const journeys = registry.list();
    const stepRuns = journeys.map((j) => stepRunner.run(j.id)).filter((r) => r.ok);
    const totalSteps = stepRuns.reduce((a, r) => a + r.summary.total, 0) || 1;
    const readySteps = stepRuns.reduce((a, r) => a + r.summary.ready, 0);
    const clScore = (cl.summary.pass / (cl.items.length || 1)) * 60;
    const stepScore = (readySteps / totalSteps) * 40;
    const score = Math.round(clScore + stepScore);
    const blockers = cl.items.filter((i) => i.status === 'fail').map((i) => i.title);
    const warnings = cl.items.filter((i) => i.status === 'warn').map((i) => i.title);
    return {
      score, status: band(score), blockers, warnings,
      readyForLocalDemo: score > 30, readyForInternalQA: score > 55, readyForComplianceReview: score > 75,
      readyForProductionPreview: score > 88, readyForProductionLaunch: score > 96,
      safety: safety.panel(),
      nextSteps: blockers.length ? ['Resolve: ' + blockers.join(', ')] : ['Run each journey once before presenting'],
    };
}
module.exports = { run, band };
