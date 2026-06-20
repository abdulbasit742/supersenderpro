// lib/staffPortal/commissionSummaryPreview.js — Safe commission preview. No payroll/payment mutation.
'use strict';

const store = require('./store');
const { safeResponse } = require('./staffPortalModel');
const { maskName } = require('./redactor');

function getCommissionSummaryPreview(input = {}) {
  const { staff } = store.findStaffPreview(input);
  const c = staff.commission || {};
  const warnings = [];
  if ((c.payoutStatus || 'pending') !== 'paid') warnings.push('commission_pending');
  return safeResponse({
    livePayrollMutation: false,
    livePaymentAction: false,
    staffMasked: maskName(staff.name),
    commissionPeriodPreview: c.period || '',
    salesAmountPreview: Number(c.sales || 0),
    commissionAmountPreview: Number(c.commission || 0),
    payoutStatusPreview: `${c.payoutStatus || 'pending'}_preview`,
    warnings,
  });
}

module.exports = { getCommissionSummaryPreview };
