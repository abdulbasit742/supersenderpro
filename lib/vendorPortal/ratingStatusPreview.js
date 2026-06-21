// lib/vendorPortal/ratingStatusPreview.js — Safe vendor rating/scorecard preview. No mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./vendorPortalModel');
const { maskName } = require('./redactor');

function getRatingStatusPreview(input = {}) {
  const { vendor } = store.findVendorPreview(input);
  const r = vendor.rating || {};
  const warnings = [];
  if (Number(r.onTimeRate || 1) < 0.9) warnings.push('on_time_rate_low_preview');
  return safeResponse({
    liveRatingMutation: false,
    vendorMasked: maskName(vendor.name),
    ratingScorePreview: Number(r.score || 0),
    onTimeRatePreview: Number(r.onTimeRate || 0),
    qualityRatePreview: Number(r.qualityRate || 0),
    warnings,
  });
}
module.exports = { getRatingStatusPreview };
