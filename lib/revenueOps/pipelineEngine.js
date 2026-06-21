// lib/revenueOps/pipelineEngine.js — deterministic pipeline health. Read-only.
'use strict';
const { STAGES } = require('./sampleDeals');

function pipelineHealth(deals) {
  const list = Array.isArray(deals) ? deals : [];
  const counts = {};
  STAGES.forEach((s) => { counts[s] = 0; });
  list.forEach((d) => { const s = d.stage || 'New Lead'; counts[s] = (counts[s] || 0) + 1; });

  const total = list.length || 1;
  const won = counts['Won Preview'] || 0;
  const lost = counts['Lost Preview'] || 0;
  const dormant = counts['Dormant / Nurture'] || 0;
  const stuck = list.filter((d) => (Number(d.lastContactDays) || 0) > 14 &&
    !['Won Preview', 'Lost Preview'].includes(d.stage)).length;

  let score = 70 + Math.round((won / total) * 30) - Math.round((lost / total) * 20)
    - Math.round((stuck / total) * 25) - Math.round((dormant / total) * 10);
  score = Math.max(0, Math.min(100, score));

  let pipelineHealthLevel = 'Critical';
  if (score >= 80) pipelineHealthLevel = 'Strong';
  else if (score >= 60) pipelineHealthLevel = 'Stable';
  else if (score >= 40) pipelineHealthLevel = 'Needs Review';

  const stageBreakdown = STAGES.map((s) => ({ stage: s, countPreview: counts[s] || 0 }));
  const risks = [];
  if (stuck) risks.push(stuck + ' opportunities stuck >14 days (preview)');
  if (lost) risks.push(lost + ' lost opportunities (preview)');
  if (dormant) risks.push(dormant + ' dormant opportunities (preview)');

  const recommendations = [];
  if (stuck) recommendations.push('Review stuck opportunities and move stale ones to nurture preview.');
  if ((counts['Payment Pending'] || 0) > 0) recommendations.push('Manually review payment-pending deals.');
  if (!recommendations.length) recommendations.push('Pipeline looks healthy in preview. Keep following up hot deals first.');

  return { pipelineHealthScore: score, pipelineHealthLevel, stageBreakdown, risks, recommendations };
}
module.exports = { pipelineHealth };
