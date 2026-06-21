// lib/franchisePortal/outstandingPayablePreview.js — Safe outstanding royalty/payable preview. No payment mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./franchisePortalModel');
const { maskName } = require('./redactor');

function getOutstandingPayablePreview(input = {}) {
  const { franchise } = store.findFranchisePreview(input);
  const invoices = franchise.royaltyInvoices || [];
  const outstanding = invoices.reduce((s, i) => s + Number(i.balance != null ? i.balance : (i.amount || 0) - (i.paid || 0)), 0);
  const overdue = invoices.filter((i) => (i.status || '') !== 'paid' && new Date(i.dueDate || 0) < new Date()).length;
  const warnings = [];
  if (overdue > 0) warnings.push('overdue_royalty_preview');
  return safeResponse({
    livePaymentAction: false,
    franchiseMasked: maskName(franchise.name),
    outstandingPayablePreview: outstanding,
    overdueInvoicesPreview: overdue,
    warnings,
  });
}
module.exports = { getOutstandingPayablePreview };
