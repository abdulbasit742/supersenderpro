// lib/ownerBriefing/alertRules.js — Derives prioritized alerts from the KPI snapshot.

function evaluate(snapshot) {
  const r = snapshot.raw || {};
  const alerts = [];
  const add = (severity, code, message) => alerts.push({ severity, code, message });

  if ((r.voice?.negative || 0) > 0) add('high', 'negative_sentiment', `${r.voice.negative} voice note(s) with negative sentiment need attention.`);
  if ((r.queue?.pendingApprovals || 0) > 0) add('medium', 'pending_approvals', `${r.queue.pendingApprovals} voice draft(s) awaiting your approval.`);
  if ((r.tasks?.open || 0) > 0) add('medium', 'open_tasks', `${r.tasks.open} onboarding task(s) still open.`);
  if (!r.setup?.hasProfile) add('high', 'no_profile', 'Business profile not set up yet — complete the Unified Setup Wizard.');

  const order = { high: 0, medium: 1, low: 2 };
  alerts.sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9));
  return alerts;
}

module.exports = { evaluate };
