// lib/securityGateway/abuseDetector.js — Orchestrates signals + scoring + recommended action. Dry-run by default.
const { config } = require('./config');
const signalsLib = require('./abuseSignals');
const scoring = require('./abuseScoring');
const suspicious = require('./suspiciousActivity');
const { safeActor } = require('./privacyGuard');

function recommend(riskLevel) {
  switch (riskLevel) {
    case 'critical': return 'block_preview_and_request_admin_review';
    case 'high': return 'warn_and_record_event';
    case 'medium': return 'warn';
    default: return 'allow_monitor';
  }
}

function check(ctx = {}) {
  const signals = signalsLib.detect(ctx);
  const { abuseScore, riskLevel } = scoring.score(signals);
  const actor = safeActor(ctx);
  suspicious.record({ keyHashed: actor.ipHash, route: ctx.route || '', scope: ctx.scope || 'generic', riskLevel });
  const blockers = signals.filter((s) => s.severity === 'critical').map((s) => s.name);
  const warnings = signals.filter((s) => s.severity !== 'critical').map((s) => s.name);
  return {
    abuseScore,
    riskLevel,
    signals,
    recommendedAction: recommend(riskLevel),
    dryRun: config.enforce !== true,
    blockers,
    warnings,
    actorSafe: actor.label,
  };
}

module.exports = { check, recommend };
