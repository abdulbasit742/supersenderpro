// lib/vendorPortal/tierStatusPreview.js — Safe vendor tier/status preview. No mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./vendorPortalModel');
const { maskName } = require('./redactor');

function getTierStatusPreview(input = {}) {
  const { vendor } = store.findVendorPreview(input);
  return safeResponse({
    liveTierMutation: false,
    vendorMasked: maskName(vendor.name),
    tierSafe: 'tier_preview',
    tierLabelPreview: `${String(vendor.tier || 'Standard').toLowerCase()}_preview`,
    benefitsPreview: ['priority_po_preview', 'faster_payment_preview'],
    warnings: [],
  });
}
module.exports = { getTierStatusPreview };
