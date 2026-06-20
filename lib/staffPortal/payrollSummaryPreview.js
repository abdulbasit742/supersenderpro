// lib/staffPortal/payrollSummaryPreview.js — Safe payroll metadata only. No payroll mutation, no payment, salary masked.
'use strict';
const store = require('./store');
const { safeResponse } = require('./staffPortalModel');
const { redactPayroll, maskSalary } = require('./redactor');

function getPayrollSummaryPreview(input = {}) {
  const { staff } = store.findStaffPreview(input);
  const p = redactPayroll(staff.payroll || {});
  return safeResponse({
    livePayrollMutation: false,
    livePaymentAction: false,
    payrollRefPreview: p.payrollRefPreview,
    salaryRefPreview: maskSalary(),
    periodSafe: p.periodSafe,
    statusPreview: p.statusPreview,
    netAmountPreview: 'salary_****',
    warnings: ['salary_masked'],
  });
}
module.exports = { getPayrollSummaryPreview };
