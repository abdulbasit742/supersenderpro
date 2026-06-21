// lib/franchisePortal/royaltyPaymentStatusPreview.js — Safe royalty invoice/payment status preview. No payment/invoice mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./franchisePortalModel');
const { redactInvoice } = require('./redactor');

function listRoyaltyInvoices(input = {}) {
  const { franchise } = store.findFranchisePreview(input);
  const warnings = [];
  const invoices = (franchise.royaltyInvoices || []).map((inv) => {
    if ((inv.status || 'pending') !== 'paid') warnings.push('royalty_payment_pending_preview');
    return redactInvoice(inv);
  });
  return safeResponse({ livePaymentAction: false, liveInvoiceMutation: false, royaltyInvoicesPreview: invoices, warnings: [...new Set(warnings)] });
}

function getRoyaltyPaymentStatusPreview(input = {}) {
  const { franchise } = store.findFranchisePreview(input);
  const inv = (franchise.royaltyInvoices || [])[0] || {};
  const r = redactInvoice(inv);
  const warnings = [];
  if ((inv.status || 'pending') !== 'paid') warnings.push('royalty_payment_pending_preview');
  return safeResponse({
    livePaymentAction: false,
    liveInvoiceMutation: false,
    invoiceIdPreview: r.invoiceIdPreview,
    amountPreview: r.amountPreview,
    paidPreview: r.paidPreview,
    balancePreview: r.balancePreview,
    paymentStatusPreview: `${inv.status || 'pending'}_preview`,
    paymentReferenceMasked: r.paymentReferenceMasked,
    warnings,
  });
}
module.exports = { listRoyaltyInvoices, getRoyaltyPaymentStatusPreview };
