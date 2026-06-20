// lib/tenantIsolation/isolationScoring.js — Compute isolation readiness score + status.
function computeScore(checks = []) { if (!checks.length) return 0; return Math.round((checks.filter((c) => c.ok).length / checks.length) * 100); }
function statusForScore(score, blockers = []) {
  if (blockers.length) return 'blocked';
  if (score >= 95) return 'production_launch_ready_with_caution';
  if (score >= 85) return 'public_preview_ready';
  if (score >= 70) return 'pilot_tenant_ready';
  if (score >= 50) return 'internal_qa_ready';
  return 'local_demo_ready';
}
module.exports = { computeScore, statusForScore };
