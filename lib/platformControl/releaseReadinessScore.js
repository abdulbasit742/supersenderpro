// lib/platformControl/releaseReadinessScore.js — read-only release readiness score (0..100).
'use strict';
const cfg = require('./config');
const { getEnvReadiness } = require('./envReadinessScanner');
const { getModuleRegistry } = require('./moduleRegistry');
const { getDeploymentChecklist } = require('./deploymentChecklist');
const { getRiskScore } = require('./riskScore');

function getReleaseReadinessScore() {
  const env = getEnvReadiness();
  const modules = getModuleRegistry();
  const deploy = getDeploymentChecklist();
  const risk = getRiskScore();

  let score = 100;
  const blockers = [];
  const recommendationsPreview = [];

  if (env.requiredKeysMissingPreview.length) {
    score -= env.requiredKeysMissingPreview.length * 15;
    env.requiredKeysMissingPreview.forEach((k) => blockers.push('required_env_missing:' + k));
    recommendationsPreview.push('Configure required env keys: ' + env.requiredKeysMissingPreview.join(', '));
  }
  const missingModules = modules.modulesPreview.filter((m) => !m.exists).length;
  if (missingModules) { score -= Math.min(20, missingModules * 4); recommendationsPreview.push('Review missing core modules (preview).'); }
  if (deploy.pendingPreview.length) { score -= Math.min(20, deploy.pendingPreview.length * 4); recommendationsPreview.push('Complete deployment checklist items: ' + deploy.pendingPreview.join(', ')); }
  score -= Math.round(risk.riskScorePreview * 0.3);

  score = Math.max(0, Math.min(100, score));
  const gradePreview = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F';
  const passPreview = score >= 75 && blockers.length === 0;

  return cfg.safetyFlags({
    scorePreview: score,
    gradePreview,
    passPreview,
    riskScorePreview: risk.riskScorePreview,
    blockers,
    recommendationsPreview,
    warnings: passPreview ? [] : ['not_release_ready_preview'],
  });
}
module.exports = { getReleaseReadinessScore };
