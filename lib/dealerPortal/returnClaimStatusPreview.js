// lib/dealerPortal/returnClaimStatusPreview.js — Safe return/RMA claim status preview. No mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');
const { maskRef, safeText } = require('./redactor');

function listReturnsClaims(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  const warnings = [];
  const items = (dealer.returns || []).map((r) => {
    if ((r.status || '') === 'under_review') warnings.push('return_under_review_preview');
    return {
      returnIdPreview: maskRef(r.id, 'rma'),
      statusPreview: `${safeText(r.status || 'unknown')}_preview`,
      reasonSafe: safeText(r.reason || ''),
    };
  });
  return safeResponse({ liveReturnMutation: false, returnsClaimsPreview: items, warnings: [...new Set(warnings)] });
}
module.exports = { listReturnsClaims };
