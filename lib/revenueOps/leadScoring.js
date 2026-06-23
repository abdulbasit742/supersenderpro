// lib/revenueOps/leadScoring.js — deterministic lead scoring (early-stage). Read-only, no external calls.
'use strict';

const SOURCE_WEIGHT = { Referral: 25, WhatsApp: 20, Website: 18, Instagram: 12, Facebook: 10, unknown: 5 };
const STAGE_WEIGHT = { 'New Lead': 8, 'Contacted': 16, 'Qualified': 28 };

function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, Math.round(n))); }

function scoreLead(lead) {
  const l = lead || {};
  const reasons = [];
  const src = SOURCE_WEIGHT[l.source] !== undefined ? SOURCE_WEIGHT[l.source] : 5;
  const stage = STAGE_WEIGHT[l.stage] !== undefined ? STAGE_WEIGHT[l.stage] : 6;
  const replies = Math.min(Number(l.replies) || 0, 5) * 4;
  const days = Number(l.lastContactDays) || 0;
  let recency = 0;
  if (days <= 2) recency = 20; else if (days <= 7) recency = 12; else if (days <= 14) recency = 4; else recency = -6;

  if (src >= 20) reasons.push('high_quality_source');
  if (replies >= 12) reasons.push('engaged_lead');
  if (recency >= 12) reasons.push('recent_activity');
  if (days > 14) reasons.push('lead_going_cold');

  const leadScore = clamp(src + stage + replies + recency + 25, 0, 100);
  let leadGrade = 'D';
  if (leadScore >= 80) leadGrade = 'A';
  else if (leadScore >= 60) leadGrade = 'B';
  else if (leadScore >= 40) leadGrade = 'C';
  return { leadScore, leadGrade, reasons };
}
module.exports = { scoreLead };
