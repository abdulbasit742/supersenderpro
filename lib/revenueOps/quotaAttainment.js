// lib/revenueOps/quotaAttainment.js — deterministic quota/target attainment (banded). Read-only.
'use strict';
const { weightedPipelineValue, BAND_MID } = require('./forecastEngine');
const { amountBand } = require('./redactor');

const TARGET_BAND_VALUE = { low: BAND_MID.low * 4, medium: BAND_MID.medium * 4, high: BAND_MID.high * 4, enterprise: BAND_MID.enterprise * 2 };

function quotaAttainment(input, deals) {
  const targetBand = (input && input.targetBand) || 'high';
  const targetValue = TARGET_BAND_VALUE[targetBand] !== undefined ? TARGET_BAND_VALUE[targetBand] : TARGET_BAND_VALUE.high;
  const weighted = weightedPipelineValue(Array.isArray(deals) ? deals : []);
  const attainmentPercentPreview = Math.max(0, Math.min(200, Math.round((weighted / targetValue) * 100)));
  let attainmentLevel = 'Behind';
  if (attainmentPercentPreview >= 100) attainmentLevel = 'On Track';
  else if (attainmentPercentPreview >= 70) attainmentLevel = 'Close';
  else if (attainmentPercentPreview >= 40) attainmentLevel = 'Needs Push';
  const gap = Math.max(0, targetValue - weighted);
  return {
    targetBandPreview: targetBand,
    targetValueBandPreview: amountBand(targetValue).label,
    forecastBandPreview: amountBand(weighted).label,
    attainmentPercentPreview,
    attainmentLevel,
    gapBandPreview: gap > 0 ? amountBand(gap).label : 'target_met_preview',
    assumptions: ['Target derived from banded heuristic; exact amounts never returned.'],
  };
}
module.exports = { quotaAttainment };
