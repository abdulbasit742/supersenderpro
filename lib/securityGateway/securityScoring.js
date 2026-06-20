// lib/securityGateway/securityScoring.js — Computes a security readiness score from doctor checks.
function computeScore(checks = []) {
  if (!checks.length) return 0;
  const passed = checks.filter((c) => c.ok).length;
  return Math.round((passed / checks.length) * 100);
}
function statusForScore(score, blockers = []) {
  if (blockers.length) return 'blocked';
  if (score >= 95) return 'production_launch_ready_with_caution';
  if (score >= 85) return 'production_preview_ready';
  if (score >= 70) return 'public_preview_ready';
  if (score >= 50) return 'internal_qa_ready';
  return 'local_demo_ready';
}
module.exports = { computeScore, statusForScore };
