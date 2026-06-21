// lib/platformControl/releaseReadinessScore.js — release score from checklist + guard + risk.
  'use strict';
  const cfg = require('./config');
  const { deploymentChecklist } = require('./deploymentChecklist');
  const { safetyGuardReport } = require('./safetyGuardReport');
  const { riskScore } = require('./riskScore');


  function releaseReadinessScore() {

     const checklist = deploymentChecklist();
     const guard = safetyGuardReport();
     const risk = riskScore();
     const ratio = checklist.totalPreview ? checklist.passedPreview / checklist.totalPreview : 0;
     let score = Math.round(ratio * 70);
     score += Math.max(0, 30 - guard.warnings.length * 3 - guard.blockers.length * 10);
     score = Math.max(0, Math.min(100, score - Math.round(risk.riskScorePreview * 0.2)));
     const gradePreview = score >= 85 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : score >= 40 ? 'D' : 'F';
     return cfg.base({
       scorePreview: score,
       gradePreview,
       passPreview: score >= 70 && guard.blockers.length === 0,
       blockers: guard.blockers,
       warnings: guard.warnings,
       recommendationsPreview: guard.warnings.slice(0, 5),
     });
 }


 module.exports = { releaseReadinessScore };
