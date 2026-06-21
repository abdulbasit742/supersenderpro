// lib/workflowOrchestrator/workflowReadinessScore.js — preview readiness for a workflow draft.
 'use strict';
 const cfg = require('./config');
 const { normalizeDraft, validate } = require('./workflowModel');
 const { workflowRiskScore } = require('./workflowRiskScore');

 function workflowReadinessScore(input) {
   const wf = normalizeDraft((input && input.workflow) || input || {});
     const v = validate(wf);
     const risk = workflowRiskScore({ workflow: wf });
     let score = 100;
     score -= v.blockers.length * 25;
     score -= v.warnings.length * 5;
     score -= Math.round(risk.riskScorePreview * 0.4);
     if (!wf.actions.length) score -= 20;
     score = Math.max(0, Math.min(100, score));
     const grade = score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : score >= 40 ? 'D' : 'F';
     return cfg.base({
      readinessScorePreview: score, gradePreview: grade, passPreview: score >= 70 && v.blockers.length === 0,
      recommendationsPreview: v.warnings.concat(risk.riskSignalsPreview).slice(0, 5),
       blockers: v.blockers, warnings: v.warnings,
     });
 }
 module.exports = { workflowReadinessScore };
