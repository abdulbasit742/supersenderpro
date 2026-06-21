// lib/dealerPortal/warrantyClaimStatusPreview.js — Safe warranty/quality claim status preview. No mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');
const { maskRef, safeText } = require('./redactor');

function listWarrantyClaims(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  const warnings = [];
  const items = (dealer.warrantyClaims || []).map((w) => {
    if ((w.status || '') === 'pending') warnings.push('warranty_claim_pending_preview');
    return {
      claimIdPreview: maskRef(w.id, 'wc'),
      statusPreview: `${safeText(w.status || 'unknown')}_preview`,
      productSafe: safeText(w.product || ''),
    };
  });
  return safeResponse({ liveWarrantyMutation: false, warrantyClaimsPreview: items, warnings: [...new Set(warnings)] });
}
module.exports = { listWarrantyClaims };
