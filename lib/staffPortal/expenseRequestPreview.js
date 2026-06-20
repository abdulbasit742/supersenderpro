// lib/staffPortal/expenseRequestPreview.js — Safe expense-request DRAFT. No expense mutation, no payment.
'use strict';
const { safeResponse } = require('./staffPortalModel');
const { safeText } = require('./redactor');

function createExpenseRequestPreview(input = {}) {
  const blockers = [];
  if (!input.amount) blockers.push('missing_expense_amount');
  return safeResponse({
    liveExpenseMutation: false,
    livePaymentAction: false,
    requestPreview: {
      typeSafe: safeText(input.type || 'general'),
      amountPreview: Number(input.amount || 0),
      noteSafe: safeText(input.note || ''),
      statusPreview: 'expense_request_preview',
    },
    blockers,
  });
}
module.exports = { createExpenseRequestPreview };
