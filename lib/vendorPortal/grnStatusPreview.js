// lib/vendorPortal/grnStatusPreview.js — Safe goods-receipt-note (GRN) status preview. No GRN mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./vendorPortalModel');
const { maskRef } = require('./redactor');

function listGrns(input = {}) {
  const { vendor } = store.findVendorPreview(input);
  const warnings = [];
  const items = (vendor.grns || []).map((g) => {
    if ((g.status || '') === 'inspection_pending') warnings.push('grn_inspection_pending_preview');
    return {
      grnIdPreview: maskRef(g.id, 'grn'),
      poIdPreview: maskRef(g.poId || 'po', 'po'),
      statusPreview: `${g.status || 'unknown'}_preview`,
      receivedQtyPreview: Number(g.receivedQty || 0),
    };
  });
  return safeResponse({ liveGrnMutation: false, grnsPreview: items, warnings: [...new Set(warnings)] });
}
module.exports = { listGrns };
