// lib/dealerPortal/outstandingBalancePreview.js — Safe outstanding balance preview. No payment mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');
const { maskName } = require('./redactor');

function getOutstandingBalancePreview(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  const invoices = dealer.invoices || [];
  const outstanding = invoices.reduce((s, i) => s + Number(i.balance != null ? i.balance : (i.amount || 0) - (i.paid || 0)), 0);
  const overdueCount = invoices.filter((i) => (i.status || '') !== 'paid' && new Date(i.dueDate || 0) < new Date()).length;
  const warnings = [];
  if (overdueCount > 0) warnings.push('overdue_balance_preview');
  return safeResponse({
    livePaymentAction: false,
    dealerMasked: maskName(dealer.name),
    outstandingBalancePreview: outstanding,
    overdueInvoicesPreview: overdueCount,
    warnings,
  });
}
module.exports = { getOutstandingBalancePreview };
