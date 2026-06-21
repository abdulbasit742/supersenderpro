// lib/franchisePortal/settlementStatusPreview.js — Safe invoice/settlement status preview. No payment/invoice mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./franchisePortalModel');
const { redactInvoice } = require('./redactor');

function listSettlements(input = {}) {
  const { franchise } = store.findFranchisePreview(input);
  const warnings = [];
  const items = (franchise.royaltyInvoices || []).map((inv) => {
    if ((inv.status || 'pending') !== 'paid') warnings.push('settlement_pending_preview');
    return redactInvoice(inv);
  });
  return safeResponse({ livePaymentAction: false, liveInvoiceMutation: false, settlementsPreview: items, warnings: [...new Set(warnings)] });
}
module.exports = { listSettlements };
