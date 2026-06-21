// lib/platformControl/riskScore.js — read-only risk score (0 best .. 100 worst).
'use strict';
const cfg = require('./config');
const { getSafetyGuardReport } = require('./safetyGuardReport');
const { getEnvReadiness } = require('./envReadinessScanner');

function getRiskScore() {
  const safety = getSafetyGuardReport();
  const env = getEnvReadiness();
  let score = 0;
  const signals = [];
  const bump = (n, sig) => { score += n; signals.push(sig); };

  if (env.requiredKeysMissingPreview.length) bump(env.requiredKeysMissingPreview.length * 12, 'required_env_missing');
  if (safety.brokenReferencesCountPreview) bump(Math.min(20, safety.brokenReferencesCountPreview * 4), 'broken_references');
  if (safety.duplicateRouteMountsPreview.length) bump(15, 'duplicate_route_mounts');
  if (safety.duplicateDashboardLinksPreview.length) bump(8, 'duplicate_dashboard_links');
  if (safety.piiFindingsCountPreview) bump(Math.min(25, safety.piiFindingsCountPreview * 8), 'public_asset_pii_or_secret');
  if (safety.dangerousScriptsPreview.length) bump(10, 'dangerous_package_scripts');

  score = Math.max(0, Math.min(100, score));
  const riskLevelPreview = score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low';
  return cfg.safetyFlags({
    riskScorePreview: score,
    riskLevelPreview,
    riskSignalsPreview: signals,
    warnings: riskLevelPreview === 'high' ? ['high_risk_preview'] : [],
    blockers: [],
  });
}
module.exports = { getRiskScore };
