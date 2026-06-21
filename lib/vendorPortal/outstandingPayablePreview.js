// lib/vendorPortal/outstandingPayablePreview.js — Safe outstanding payable preview. No payment mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./vendorPortalModel');
const { maskName } = require('./redactor');

function getOutstandingPayablePreview(input = {}) {
  const { vendor } = store.findVendorPreview(input);
  const invoices = vendor.invoices || [];
  const outstanding = invoices.reduce((s, i) => s + Number(i.balance != null ? i.balance : (i.amount || 0) - (i.paid || 0)), 0);
  const overdue = invoices.filter((i) => (i.status || '') !== 'paid' && new Date(i.dueDate || 0) < new Date()).length;
  const warnings = [];
  if (overdue > 0) warnings.push('overdue_payable_preview');
  return safeResponse({
    livePaymentAction: false,
    vendorMasked: maskName(vendor.name),
    outstandingPayablePreview: outstanding,
    overdueInvoicesPreview: overdue,
    warnings,
  });
}
module.exports = { getOutstandingPayablePreview };
