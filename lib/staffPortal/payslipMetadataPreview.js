// lib/staffPortal/payslipMetadataPreview.js — Safe payslip METADATA only. No raw payslip download, amounts masked.
'use strict';
const store = require('./store');
const { safeResponse } = require('./staffPortalModel');
const { maskRef, safeText } = require('./redactor');

function listPayslips(input = {}) {
  const { staff } = store.findStaffPreview(input);
  const payslips = (staff.payslips || []).map((p) => ({
    payslipIdPreview: maskRef(p.id, 'pslip'),
    periodSafe: safeText(p.period),
    statusPreview: `${p.status}_preview`,
    amountPreview: 'salary_****',
  }));
  return safeResponse({ livePayslipDownload: false, liveShare: false, payslipsPreview: payslips });
}
function getPayslipMetadataPreview(input = {}) {
  const list = listPayslips(input);
  return safeResponse({ livePayslipDownload: false, payslipPreview: (list.payslipsPreview || [])[0] || {} });
}
module.exports = { listPayslips, getPayslipMetadataPreview };
