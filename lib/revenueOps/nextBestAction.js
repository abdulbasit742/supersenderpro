// lib/revenueOps/nextBestAction.js — deterministic per-opportunity next-best-action. No sends, no mutation.
'use strict';
const { scoreDeal } = require('./dealScoring');
const { readinessForDeal } = require('./followupReadiness');
const { maskName, maskRef } = require('./redactor');

function actionFor(d) {
  const sc = scoreDeal(d);
  const fr = readinessForDeal(d);
  let action = 'Follow up (preview)';
  let priority = 'medium';
  const days = Number(d.lastContactDays) || 0;
  if (d.complaintRisk) { action = 'Route to human review (complaint risk)'; priority = 'high'; }
  else if (d.stage === 'Payment Pending') { action = 'Send utility payment reminder (preview only)'; priority = 'high'; }
  else if (sc.scoreLevel === 'Hot') { action = 'Prioritize call/close (hot deal)'; priority = 'high'; }
  else if (d.stage === 'Negotiation') { action = 'Clarify CTA and resolve objections (preview)'; priority = 'high'; }
  else if (days > 30) { action = 'Move to nurture preview'; priority = 'low'; }
  else if ((d.consent || 'unknown') === 'unknown') { action = 'Confirm consent before marketing follow-up'; priority = 'medium'; }
  return {
    opportunityIdPreview: maskRef(d.id || 'opp'),
    maskedCustomerName: maskName(d.customerName || d.name),
    stage: d.stage,
    dealScore: sc.dealScore,
    followupReadiness: fr.followupReadinessScore,
    nextBestActionPreview: action,
    priority,
  };
}

function nextBestActions(deals) {
  const list = Array.isArray(deals) ? deals : [];
  const order = { high: 0, medium: 1, low: 2 };
  return list.filter((d) => !['Won Preview', 'Lost Preview'].includes(d.stage))
    .map(actionFor)
    .sort((a, b) => (order[a.priority] - order[b.priority]) || (b.dealScore - a.dealScore));
}
module.exports = { nextBestActions, actionFor };
