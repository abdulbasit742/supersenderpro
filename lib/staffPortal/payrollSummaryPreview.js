// lib/staffPortal/payrollSummaryPreview.js — Safe payroll metadata preview. No payroll/payment mutation. Salary & bank masked.
'use strict';

const store = require('./store');
const { safeResponse } = require('./staffPortalModel');
const { maskName, maskBankRef } = require('./redactor');

function listPayroll(input = {}) {
  return getPayrollSummaryPreview(input);
}

function getPayrollSummaryPreview(input = {}) {
  const { staff } = store.findStaffPreview(input);
  const p = staff.payroll || {};
  const warnings = ['salary_masked', 'bank_detail_masked'];
  if (p.status !== 'paid') warnings.push('payroll_pending');
  return safeResponse({
    livePayrollMutation: false,
    livePaymentAction: false,
    staffMasked: maskName(staff.name),
    payrollPeriodPreview: p.period || '',
    grossPayPreview: Number(p.gross || 0),
    deductionsPreview: Number(p.deductions || 0),
    netPayPreview: Number(p.net || 0),
    paymentStatusPreview: 'preview_only',
    bankRefMasked: maskBankRef(p.bankRef),
    warnings,
  });
}

module.exports = { listPayroll, getPayrollSummaryPreview };
