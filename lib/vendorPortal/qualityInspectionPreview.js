// lib/vendorPortal/qualityInspectionPreview.js — Safe quality inspection / return status preview. No mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./vendorPortalModel');
const { maskRef, safeText } = require('./redactor');

function listQualityInspections(input = {}) {
  const { vendor } = store.findVendorPreview(input);
  const warnings = [];
  const items = (vendor.qualityInspections || []).map((q) => {
    if ((q.status || '') === 'pending') warnings.push('inspection_pending_preview');
    return {
      inspectionIdPreview: maskRef(q.id, 'qc'),
      grnIdPreview: maskRef(q.grnId || 'grn', 'grn'),
      statusPreview: `${q.status || 'unknown'}_preview`,
      resultSafe: safeText(q.result || ''),
    };
  });
  return safeResponse({ liveInspectionMutation: false, qualityInspectionsPreview: items, warnings: [...new Set(warnings)] });
}
module.exports = { listQualityInspections };
