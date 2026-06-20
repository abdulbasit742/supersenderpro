// lib/staffPortal/expenseStatusPreview.js — Safe expense/reimbursement status. No expense mutation, no payment.
'use strict';
const store = require('./store');
const { safeResponse } = require('./staffPortalModel');
const { maskRef, safeText } = require('./redactor');

function listExpenses(input = {}) {
  const { staff } = store.findStaffPreview(input);
  const warnings = [];
  const expenses = (staff.expenses || []).map((e) => {
    if (e.status === 'pending') warnings.push('expense_pending');
    return {
      expenseIdPreview: maskRef(e.id, 'exp'),
      typeSafe: safeText(e.type),
      statusPreview: `${e.status}_preview`,
      amountPreview: Number(e.amount || 0),
    };
  });
  return safeResponse({ liveExpenseMutation: false, livePaymentAction: false, expensesPreview: expenses, warnings });
}
function getExpenseStatusPreview(input = {}) {
  const list = listExpenses(input);
  return safeResponse({ liveExpenseMutation: false, livePaymentAction: false, expensePreview: (list.expensesPreview || [])[0] || {}, warnings: list.warnings });
}
module.exports = { listExpenses, getExpenseStatusPreview };
