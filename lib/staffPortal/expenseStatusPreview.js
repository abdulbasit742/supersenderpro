// lib/staffPortal/expenseStatusPreview.js — Safe expense/reimbursement previews. No expense/payment mutation.
'use strict';

const store = require('./store');
const { safeResponse } = require('./staffPortalModel');
const { maskRef } = require('./redactor');

function listExpenses(input = {}) {
  const { staff } = store.findStaffPreview(input);
  const warnings = [];
  const items = (staff.expenses || []).map((e) => {
    if ((e.approvalStatus || 'pending') === 'pending') warnings.push('expense_pending');
    if ((e.paymentStatus || 'not_paid') !== 'paid') warnings.push('reimbursement_pending');
    return {
      expenseIdPreview: maskRef(e.id || 'exp', 'exp'),
      amountPreview: Number(e.amount || 0),
      approvalStatusPreview: `${e.approvalStatus || 'pending'}_preview`,
      paymentStatusPreview: `${e.paymentStatus || 'not_paid'}_preview`,
    };
  });
  return safeResponse({ liveExpenseMutation: false, livePaymentAction: false, expensesPreview: items, warnings: [...new Set(warnings)] });
}

function getExpenseStatusPreview(input = {}) {
  const { staff } = store.findStaffPreview(input);
  const e = (staff.expenses || [])[0] || {};
  const warnings = [];
  if ((e.approvalStatus || 'pending') === 'pending') warnings.push('expense_pending');
  if ((e.paymentStatus || 'not_paid') !== 'paid') warnings.push('reimbursement_pending');
  return safeResponse({
    liveExpenseMutation: false,
    livePaymentAction: false,
    expenseIdPreview: maskRef(e.id || 'exp', 'exp'),
    amountPreview: Number(e.amount || 0),
    approvalStatusPreview: `${e.approvalStatus || 'pending'}_preview`,
    paymentStatusPreview: `${e.paymentStatus || 'not_paid'}_preview`,
    warnings,
  });
}

module.exports = { listExpenses, getExpenseStatusPreview };
