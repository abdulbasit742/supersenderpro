'use strict';


/**
    * Pilot Ops — success score (0-100) from onboarding + activity signals.
    * Pure function over a pilot + its setup summary + optional signals. No I/O.
    */

const setupProgress = require('./setupProgress');

const FACTORS = [
  { key: 'checklistCompletion', weight: 25 },
     { key: 'demoCompleted', weight: 10 },
     { key: 'trialActive', weight: 10 },
     { key: 'keyModulesConfigured', weight: 15 },
     { key: 'firstWorkflowTested', weight: 10 },
     { key: 'ownerBriefingGenerated', weight: 5 },
     { key: 'followupDrafted', weight: 5 },
     { key: 'automationDraftCreated', weight: 5 },
     { key: 'noCriticalIncidents', weight: 10 },
     { key: 'positiveFeedback', weight: 5 },
];


function compute(pilot, signals) {
     const s = signals || {};
     const prog = setupProgress.summarize(pilot && pilot.id);
     const values = {
       checklistCompletion: prog.percent / 100,
         demoCompleted: s.demoCompleted ? 1 : 0,
         trialActive: (pilot && ['active', 'active_dry_run'].indexOf(pilot.trialStatus) !== -1) ? 1 : 0,
    keyModulesConfigured: s.keyModulesConfigured != null ? clamp01(s.keyModulesConfigured) : (prog.requiredCompleted /
Math.max(1, prog.required)),
         firstWorkflowTested: s.firstWorkflowTested ? 1 : 0,
         ownerBriefingGenerated: s.ownerBriefingGenerated ? 1 : 0,
         followupDrafted: s.followupDrafted ? 1 : 0,
         automationDraftCreated: s.automationDraftCreated ? 1 : 0,
         noCriticalIncidents: s.criticalIncidents ? 0 : 1,
         positiveFeedback: s.positiveFeedback ? 1 : 0,
     };
     let total = 0;
     const breakdown = {};
     FACTORS.forEach(function (f) { const pts = Math.round((values[f.key] || 0) * f.weight); breakdown[f.key] = pts; total
+= pts; });
  return { score: Math.max(0, Math.min(100, total)), breakdown: breakdown, progressPercent: prog.percent };
}

function clamp01(n) { return Math.max(0, Math.min(1, Number(n) || 0)); }

module.exports = { FACTORS, compute };
