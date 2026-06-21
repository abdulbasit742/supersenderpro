// lib/dealerPortal/statementPreview.js — Statement of account preview. No invoice/payment mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./dealerPortalModel');
const { maskName } = require('./redactor');

function getStatementPreview(input = {}) {
  const { dealer } = store.findDealerPreview(input);
  const s = dealer.statement || {};
  return safeResponse({
    liveInvoiceMutation: false,
    livePaymentAction: false,
    dealerMasked: maskName(dealer.name),
    periodPreview: s.period || '',
    openingBalancePreview: Number(s.openingBalance || 0),
    chargesPreview: Number(s.charges || 0),
    paymentsPreview: Number(s.payments || 0),
    closingBalancePreview: Number(s.closingBalance || 0),
    warnings: Number(s.closingBalance || 0) > 0 ? ['outstanding_balance_high'] : [],
  });
}
module.exports = { getStatementPreview };
