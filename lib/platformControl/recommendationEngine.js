// lib/platformControl/recommendationEngine.js — read-only recommended next actions.
'use strict';
const cfg = require('./config');
const { getReleaseReadinessScore } = require('./releaseReadinessScore');
const { getRiskScore } = require('./riskScore');
const { getSafetyGuardReport } = require('./safetyGuardReport');
const { getSecretPresence } = require('./secretPresenceChecker');

function getRecommendations() {
  const release = getReleaseReadinessScore();
  const risk = getRiskScore();
  const safety = getSafetyGuardReport();
  const secrets = getSecretPresence();

  const recs = [];
  const add = (priority, action) => recs.push({ priority, action });

  (release.blockers || []).forEach((b) => add('high', 'Resolve blocker: ' + b));
  (safety.safetySignalsPreview || []).forEach((s) => add('medium', 'Investigate safety signal: ' + s));
  if (secrets.missingSecretsPreview && secrets.missingSecretsPreview.length) {
    add('medium', 'Configure missing secrets (presence-only): ' + secrets.missingSecretsPreview.slice(0, 6).join(', '));
  }
  if (risk.riskLevelPreview === 'high') add('high', 'Reduce overall risk score before release.');
  if (!recs.length) add('low', 'No critical actions detected in preview. Re-run scans before each release.');

  return cfg.safetyFlags({
    recommendationsPreview: recs,
    totalPreview: recs.length,
    highPriorityCountPreview: recs.filter((r) => r.priority === 'high').length,
    warnings: [], blockers: [],
  });
}
module.exports = { getRecommendations };
