// lib/staffPortal/commissionSummaryPreview.js — Safe commission summary preview (amounts masked).
'use strict';
const store = require('./store');
const { safeResponse } = require('./staffPortalModel');
const { safeText } = require('./redactor');

function getCommissionSummaryPreview(input = {}) {
  const { staff } = store.findStaffPreview(input);
  const c = staff.commission || {};
  return safeResponse({
    livePaymentAction: false,
    periodSafe: safeText(c.period || ''),
    dealsClosedPreview: Number(c.dealsClosed || 0),
    earnedPreview: 'salary_****',
    statusPreview: `${c.status || 'unknown'}_preview`,
    warnings: ['salary_masked'],
  });
}
module.exports = { getCommissionSummaryPreview };
