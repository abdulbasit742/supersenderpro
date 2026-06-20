// lib/unifiedSetup/readinessScoring.js — Pure scoring helpers used by the readiness report.

function scoreSteps(steps) {
  const weight = { verified: 1, configured: 0.85, partially_configured: 0.5, skipped: 0.5,
    missing_config: 0.15, blocked: 0, not_started: 0 };
  if (!steps.length) return 0;
  const total = steps.reduce((s, st) => s + (weight[st.status] ?? 0), 0);
  return Math.round((total / steps.length) * 100);
}

function scoreCredentials(checklist) {
  const required = checklist.filter((c) => c.required);
  if (!required.length) return 100;
  const set = required.filter((c) => c.set).length;
  return Math.round((set / required.length) * 100);
}

module.exports = { scoreSteps, scoreCredentials };
