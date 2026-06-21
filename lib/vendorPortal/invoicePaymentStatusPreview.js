// lib/vendorPortal/invoicePaymentStatusPreview.js — Safe vendor invoice/payment status previews. No payment/invoice mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./vendorPortalModel');
const { redactInvoice } = require('./redactor');

function listInvoices(input = {}) {
  const { vendor } = store.findVendorPreview(input);
  const warnings = [];
  const invoices = (vendor.invoices || []).map((inv) => {
    if ((inv.status || 'pending') !== 'paid') warnings.push('payment_pending_preview');
    return redactInvoice(inv);
  });
  return safeResponse({ livePaymentAction: false, liveInvoiceMutation: false, invoicesPreview: invoices, warnings: [...new Set(warnings)] });
}

function getInvoicePaymentStatusPreview(input = {}) {
  const { vendor } = store.findVendorPreview(input);
  const inv = (vendor.invoices || [])[0] || {};
  const r = redactInvoice(inv);
  const warnings = [];
  if ((inv.status || 'pending') !== 'paid') warnings.push('payment_pending_preview');
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
module.exports = { listInvoices, getInvoicePaymentStatusPreview };
