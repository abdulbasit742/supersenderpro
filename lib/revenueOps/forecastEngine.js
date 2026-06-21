// lib/revenueOps/forecastEngine.js — deterministic, banded sales forecast. Exact amounts never returned.
'use strict';
const { scoreDeal } = require('./dealScoring');
const { amountBand } = require('./redactor');

const BAND_MID = { low: 25000, medium: 150000, high: 600000, enterprise: 1500000, unknown: 50000 };

function forecast(deals) {
  const list = Array.isArray(deals) ? deals : [];
  let weightedValue = 0;
  let expectedWins = 0;
  list.forEach((d) => {
    if (['Lost Preview'].includes(d.stage)) return;
    const band = d.valueBand || amountBand(d.value).band;
    const mid = BAND_MID[band] !== undefined ? BAND_MID[band] : 50000;
    const prob = scoreDeal(d).closeProbabilityPreview / 100;
    weightedValue += mid * prob;
    if (prob >= 0.6) expectedWins += 1;
  });
  const weightedForecastScore = Math.max(0, Math.min(100, Math.round((weightedValue / (BAND_MID.enterprise * Math.max(list.length, 1))) * 100)));
  const forecastAmountPreview = amountBand(weightedValue).label;
  let forecastConfidence = 'Low';
  if (weightedForecastScore >= 55) forecastConfidence = 'High';
  else if (weightedForecastScore >= 30) forecastConfidence = 'Medium';
  return {
    forecastAmountPreview,
    weightedForecastScore,
    expectedWinsPreview: expectedWins,
    forecastConfidence,
    assumptions: [
      'Banded mid-points used instead of exact (possibly real) deal values.',
      'Close probability derived from deterministic stage + engagement heuristics.',
      'Lost opportunities excluded; no live CRM data is read.',
    ],
  };
}
module.exports = { forecast };
