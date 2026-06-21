// lib/vendorPortal/invoiceSubmissionPreview.js — Draft a vendor invoice submission PREVIEW. Never submits or pays.
'use strict';
const store = require('./store');
const { safeResponse } = require('./vendorPortalModel');
const { maskName, maskRef, safeText } = require('./redactor');

function createInvoiceSubmissionPreview(input = {}) {
  const { vendor } = store.findVendorPreview(input);
  const lines = Array.isArray(input.items) ? input.items.map((it) => ({
    skuPreview: safeText(it.sku || it.skuId || 'sku'),
    qtyPreview: Number(it.qty || it.quantity || 0),
    unitPricePreview: Number(it.unitPrice || 0),
    lineTotalPreview: Number(it.qty || 0) * Number(it.unitPrice || 0),
  })) : [];
  const subtotal = lines.reduce((s, l) => s + l.lineTotalPreview, 0);
  return safeResponse({
    liveInvoiceSubmission: false,
    liveInvoiceMutation: false,
    livePaymentAction: false,
    vendorMasked: maskName(vendor.name),
    invoiceDraftPreview: {
      poIdPreview: maskRef(input.poId || 'po', 'po'),
      itemsPreview: lines,
      subtotalPreview: subtotal,
      taxPreview: 0,
      totalPreview: subtotal,
    },
    notePreview: safeText(input.note || 'Invoice submission draft — nothing is submitted or paid. Contact procurement to submit a real invoice.'),
    warnings: ['live_send_disabled'],
  });
}
module.exports = { createInvoiceSubmissionPreview };
