// lib/staffPortal/expenseRequestPreview.js — Draft an expense/reimbursement request PREVIEW. Never submits or pays.
'use strict';

const store = require('./store');
const { safeResponse } = require('./staffPortalModel');
const { maskName, safeText } = require('./redactor');

function createExpenseRequestPreview(input = {}) {
  const { staff } = store.findStaffPreview(input);
  const expensePreview = {
    categoryPreview: safeText(input.category || 'general'),
    amountPreview: Number(input.amount || 0),
    descriptionPreview: safeText(input.description || 'Expense request draft — nothing is submitted or paid.'),
  };
  return safeResponse({
    liveExpenseMutation: false,
    livePaymentAction: false,
    staffMasked: maskName(staff.name),
    expensePreview,
    approvalRequiredPreview: true,
    warnings: ['expense_pending'],
  });
}

module.exports = { createExpenseRequestPreview };
