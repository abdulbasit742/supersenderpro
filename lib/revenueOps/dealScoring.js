// lib/revenueOps/dealScoring.js — deterministic deal scoring. No randomness, no external calls.
'use strict';

const STAGE_WEIGHT = {
  'New Lead': 10, 'Contacted': 20, 'Qualified': 35, 'Demo / Discussion': 50, 'Quotation Sent': 65,
  'Negotiation': 75, 'Payment Pending': 85, 'Won Preview': 100, 'Lost Preview': 0, 'Dormant / Nurture': 15,
};
const STAGE_PROB = {
  'New Lead': 10, 'Contacted': 20, 'Qualified': 35, 'Demo / Discussion': 50, 'Quotation Sent': 60,
  'Negotiation': 70, 'Payment Pending': 85, 'Won Preview': 99, 'Lost Preview': 2, 'Dormant / Nurture': 8,
};
const VALUE_SCORE = { low: 3, medium: 8, high: 15, enterprise: 18, unknown: 5 };

function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, Math.round(n))); }

function recencyScore(days) {
  const d = Number(days) || 0;
  if (d <= 2) return 20;
  if (d <= 7) return 12;
  if (d <= 14) return 5;
  if (d <= 30) return 0;
  return -10;
}

function scoreDeal(deal) {
  const d = deal || {};
  const stage = d.stage || 'New Lead';
  const reasons = [];
  const blockers = [];

  const sw = STAGE_WEIGHT[stage] !== undefined ? STAGE_WEIGHT[stage] : 10;
  const rec = recencyScore(d.lastContactDays);
  const reply = clamp(Math.min(Number(d.replies) || 0, 5) * 3, 0, 15);
  const valBand = d.valueBand || 'unknown';
  const val = VALUE_SCORE[valBand] !== undefined ? VALUE_SCORE[valBand] : 5;
  const pay = (d.paymentStatus === 'paid' || d.paymentStatus === 'partial') ? 10 : 0;

  let score = sw * 0.5 + rec + reply + val + pay;
  if (d.complaintRisk) { score -= 15; reasons.push('complaint_risk_penalty'); blockers.push('complaint_risk_needs_human_review'); }
  if ((Number(d.lastContactDays) || 0) > 30) reasons.push('contact_stale');
  if (rec >= 12) reasons.push('recent_contact');
  if (reply >= 9) reasons.push('high_engagement');
  if (val >= 15) reasons.push('high_value_band');
  if (stage === 'Lost Preview') { score = 5; reasons.push('stage_lost'); }

  const dealScore = clamp(score, 0, 100);
  let scoreLevel = 'Needs Review';
  if (stage !== 'Lost Preview') {
    if (dealScore >= 80) scoreLevel = 'Hot';
    else if (dealScore >= 60) scoreLevel = 'Warm';
    else if (dealScore >= 40) scoreLevel = 'Neutral';
    else if (dealScore >= 20) scoreLevel = 'Cold';
  }

  const stageProb = STAGE_PROB[stage] !== undefined ? STAGE_PROB[stage] : 10;
  const closeProbabilityPreview = clamp((stageProb + dealScore) / 2, 0, 99);

  return { dealScore, scoreLevel, closeProbabilityPreview, reasons, blockers };
}

module.exports = { scoreDeal, STAGE_WEIGHT, STAGE_PROB };
