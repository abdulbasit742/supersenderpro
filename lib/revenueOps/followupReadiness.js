// lib/revenueOps/followupReadiness.js — deterministic follow-up readiness. No sends. Respects consent preview.
'use strict';

function readinessForDeal(deal) {
  const d = deal || {};
  const days = Number(d.lastContactDays) || 0;
  const consent = d.consent || 'unknown';
  const blockers = [];
  const recommendations = [];
  let score = 50;

  if (days <= 2) { score += 20; }
  else if (days <= 7) { score += 10; }
  else if (days > 14) { score -= 15; recommendations.push('Contact is stale; consider nurture preview.'); }

  let suggestedFollowupType = 'Sales';
  if (d.stage === 'Payment Pending') { suggestedFollowupType = 'Payment Reminder'; score += 10; recommendations.push('Use a utility template for payment reminder preview.'); }
  if (d.complaintRisk) { suggestedFollowupType = 'Human Review'; blockers.push('complaint_risk'); score -= 10; }
  if (consent === 'unknown') { blockers.push('consent_unknown'); recommendations.push('Avoid marketing follow-up for unknown consent.'); suggestedFollowupType = 'Utility'; }
  if (consent === 'opt_out') { blockers.push('opted_out'); suggestedFollowupType = 'None'; score = Math.min(score, 25); }

  score = Math.max(0, Math.min(100, Math.round(score)));
  let readinessLevel = 'Needs Review';
  if (blockers.includes('opted_out')) readinessLevel = 'Suppressed Preview';
  else if (score >= 75 && !blockers.length) readinessLevel = 'Ready';
  else if (score >= 50) readinessLevel = 'Wait';

  return { followupReadinessScore: score, readinessLevel, suggestedFollowupType, blockers, recommendations };
}

function readinessAggregate(deals) {
  const list = Array.isArray(deals) && deals.length ? deals : [];
  if (!list.length) return { followupReadinessScore: 0, readinessLevel: 'Needs Review', suggestedFollowupType: 'None', blockers: [], recommendations: ['No opportunities in preview.'] };
  const per = list.map(readinessForDeal);
  const avg = Math.round(per.reduce((a, r) => a + r.followupReadinessScore, 0) / per.length);
  const ready = per.filter((r) => r.readinessLevel === 'Ready').length;
  const suppressed = per.filter((r) => r.readinessLevel === 'Suppressed Preview').length;
  let readinessLevel = 'Needs Review';
  if (avg >= 75) readinessLevel = 'Ready';
  else if (avg >= 50) readinessLevel = 'Wait';
  return {
    followupReadinessScore: avg,
    readinessLevel,
    suggestedFollowupType: ready >= suppressed ? 'Sales' : 'Human Review',
    readyCountPreview: ready,
    suppressedCountPreview: suppressed,
    blockers: [],
    recommendations: ['Follow up Ready opportunities first.', 'Send payment reminders via utility template preview only.'],
  };
}
module.exports = { readinessForDeal, readinessAggregate };
