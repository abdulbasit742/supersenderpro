// lib/revenueOps/salesVelocity.js — deterministic sales/pipeline velocity (banded). No exact revenue returned.
'use strict';
const { scoreDeal } = require('./dealScoring');
const { weightedPipelineValue, BAND_MID } = require('./forecastEngine');
const { amountBand } = require('./redactor');

function salesVelocity(deals) {
  const list = Array.isArray(deals) ? deals : [];
  const active = list.filter((d) => !['Lost Preview'].includes(d.stage));
  const wins = list.filter((d) => d.stage === 'Won Preview').length;
  const closed = wins + list.filter((d) => d.stage === 'Lost Preview').length;
  const winRatePreview = closed > 0 ? Math.round((wins / closed) * 100) : 0;
  const avgCycleDaysPreview = active.length ? Math.round(active.reduce((a, d) => a + (Number(d.lastContactDays) || 0), 0) / active.length) : 0;
  const avgDealMid = active.length ? active.reduce((a, d) => a + (BAND_MID[d.valueBand] || 50000), 0) / active.length : 0;
  const denom = Math.max(1, avgCycleDaysPreview);
  // Velocity (raw) = active opps * winRate * avgDealValue / cycleDays  -> banded, never returned raw
  const velocityRaw = (active.length * (winRatePreview / 100) * avgDealMid) / denom;
  const salesVelocityBandPreview = amountBand(velocityRaw * denom).label; // band the per-cycle throughput
  const velocityScore = Math.max(0, Math.min(100, Math.round((weightedPipelineValue(list) / (BAND_MID.enterprise * Math.max(list.length, 1))) * 100)));
  return {
    salesVelocityBandPreview,
    velocityScore,
    winRatePreview,
    avgDealValueBandPreview: amountBand(avgDealMid).band,
    avgCycleDaysPreview,
    activeOpportunitiesPreview: active.length,
    assumptions: ['Banded values used; exact revenue never returned.', 'Cycle length approximated by avg last-contact age (preview).'],
  };
}
module.exports = { salesVelocity };
