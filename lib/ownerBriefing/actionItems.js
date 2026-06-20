// lib/ownerBriefing/actionItems.js — Turns alerts into concrete, owner-friendly action items.

const ACTIONS = {
  negative_sentiment: { title: 'Review negative voice notes', route: '/voice-ai.html', priority: 'high' },
  pending_approvals: { title: 'Approve or reject pending voice drafts', route: '/voice-ai.html', priority: 'medium' },
  open_tasks: { title: 'Work through open onboarding tasks', route: '/unified-setup.html', priority: 'medium' },
  no_profile: { title: 'Complete your business profile', route: '/unified-setup.html', priority: 'high' },
};

function fromAlerts(alerts = []) {
  return alerts.map((a) => {
    const t = ACTIONS[a.code] || { title: a.message, route: null, priority: a.severity };
    return { code: a.code, title: t.title, actionRoute: t.route, priority: t.priority, why: a.message };
  });
}

module.exports = { fromAlerts };
