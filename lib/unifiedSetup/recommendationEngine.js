// lib/unifiedSetup/recommendationEngine.js — Turns current step statuses into prioritized
// next-step recommendations.

const stepEngine = require('./stepEngine');

const PRIORITY = { blocked: 0, missing_config: 1, not_started: 2, partially_configured: 3, configured: 4, verified: 5, skipped: 6 };

function topNextSteps(limit = 6) {
  const steps = stepEngine.allSteps();
  return steps
    .filter((s) => !['verified', 'skipped'].includes(s.status))
    .sort((a, b) => {
      if (a.required !== b.required) return a.required ? -1 : 1;
      return (PRIORITY[a.status] ?? 9) - (PRIORITY[b.status] ?? 9);
    })
    .slice(0, limit)
    .map((s) => ({ id: s.id, title: s.title, status: s.status, required: s.required, nextAction: s.nextAction, docsLink: s.docsLink }));
}

module.exports = { topNextSteps };
