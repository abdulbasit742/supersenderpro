// lib/staffPortal/payslipMetadataPreview.js — Payslip metadata only. No raw payslip download, ever.
'use strict';

const store = require('./store');
const { safeResponse } = require('./staffPortalModel');
const { maskRef } = require('./redactor');

function listPayslips(input = {}) {
  const { staff } = store.findStaffPreview(input);
  const slips = (staff.payslips || []).map((s) => ({
    payslipIdPreview: maskRef(s.id || 'payslip', 'payslip'),
    periodPreview: s.period || '',
    statusPreview: 'available_metadata_preview',
    downloadEnabled: false,
  }));
  return safeResponse({ liveDocumentDownload: false, livePayrollMutation: false, payslipsPreview: slips, warnings: ['payslip_metadata_only'] });
}

function getPayslipMetadataPreview(input = {}) {
  const { staff } = store.findStaffPreview(input);
  const s = (staff.payslips || [])[0] || {};
  return safeResponse({
    liveDocumentDownload: false,
    livePayrollMutation: false,
    payslipIdPreview: maskRef(s.id || 'payslip', 'payslip'),
    periodPreview: s.period || '',
    statusPreview: 'available_metadata_preview',
    downloadEnabled: false,
    warnings: ['payslip_metadata_only'],
  });
}

module.exports = { listPayslips, getPayslipMetadataPreview };
