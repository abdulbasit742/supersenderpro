// lib/staffPortal/staffPortalService.js — Central service: status, lookup, and re-export of all previews.
// Everything dry-run / preview-only. No external calls, no live mutations, no live sends.
'use strict';

const store = require('./store');
const model = require('./staffPortalModel');
const { redactStaff } = require('./redactor');

const profile = require('./profileStatusPreview');
const attendance = require('./attendanceStatusPreview');
const shift = require('./shiftStatusPreview');
const leave = require('./leaveStatusPreview');
const leaveReq = require('./leaveRequestPreview');
const payroll = require('./payrollSummaryPreview');
const payslip = require('./payslipMetadataPreview');
const commission = require('./commissionSummaryPreview');
const expense = require('./expenseStatusPreview');
const expenseReq = require('./expenseRequestPreview');
const task = require('./taskStatusPreview');
const sop = require('./sopStatusPreview');
const branch = require('./branchAssignmentPreview');
const approval = require('./approvalStatusPreview');
const documents = require('./documentRequestPreview');
const contract = require('./contractStatusPreview');
const hrSupport = require('./hrSupportRequestPreview');
const drafts = require('./messageDrafts');
const audit = require('./auditPreview');
const summary = require('./statusSummaryPreview');

const SUPPORTED_MODULES = [
  'profile', 'attendance', 'shifts', 'leave', 'payroll', 'payslips', 'commission',
  'expenses', 'tasks', 'sops', 'branch-assignment', 'approvals', 'documents', 'contracts',
];

function getStaffPortalStatus() {
  return model.safeResponse({
    staffPortalPublicLive: false,
    liveActionsEnabled: false,
    piiMasked: true,
    externalCallsEnabled: false,
    supportedModules: SUPPORTED_MODULES,
    accessModes: model.ACCESS_MODES,
    portalStatuses: model.PORTAL_STATUSES,
  });
}

function lookupStaffPreview(input = {}) {
  const { staff, accessMode } = store.findStaffPreview(input);
  const r = redactStaff(staff);
  audit.recordPreview('lookup_preview', staff);
  return model.safeResponse({
    liveAuthEnabled: false,
    lookupMode: accessMode,
    staffNameSafe: r.staffNameSafe,
    phoneMasked: r.phoneMasked,
    emailMasked: r.emailMasked,
    portalTokenPreview: 'preview_****',
    warnings: ['auth_preview_only', 'pii_masked'],
  });
}

function getStaffSummaryPreview(input = {}) { audit.recordPreview('summary_preview', store.demoStaff()); return summary.getStaffSummaryPreview(input); }

module.exports = {
  SUPPORTED_MODULES,
  getStaffPortalStatus,
  lookupStaffPreview,
  getStaffSummaryPreview,
  getProfilePreview: profile.getProfilePreview,
  getAttendanceStatusPreview: attendance.getAttendanceStatusPreview,
  listShifts: shift.listShifts, getShiftStatusPreview: shift.getShiftStatusPreview,
  getLeaveStatusPreview: leave.getLeaveStatusPreview,
  createLeaveRequestPreview: (i) => { audit.recordPreview('leave_request_preview', store.demoStaff()); return leaveReq.createLeaveRequestPreview(i); },
  getPayrollSummaryPreview: payroll.getPayrollSummaryPreview,
  listPayslips: payslip.listPayslips, getPayslipMetadataPreview: payslip.getPayslipMetadataPreview,
  getCommissionSummaryPreview: commission.getCommissionSummaryPreview,
  listExpenses: expense.listExpenses, getExpenseStatusPreview: expense.getExpenseStatusPreview,
  createExpenseRequestPreview: (i) => { audit.recordPreview('expense_request_preview', store.demoStaff()); return expenseReq.createExpenseRequestPreview(i); },
  listTasks: task.listTasks, getTaskStatusPreview: task.getTaskStatusPreview,
  listSops: sop.listSops, getSopStatusPreview: sop.getSopStatusPreview,
  getBranchAssignmentPreview: branch.getBranchAssignmentPreview,
  listApprovals: approval.listApprovals, getApprovalStatusPreview: approval.getApprovalStatusPreview,
  listDocuments: documents.listDocuments, getDocumentStatusPreview: documents.getDocumentStatusPreview,
  createDocumentRequestPreview: (i) => { audit.recordPreview('document_request_preview', store.demoStaff()); return documents.createDocumentRequestPreview(i); },
  listContracts: contract.listContracts, getContractStatusPreview: contract.getContractStatusPreview,
  createHrSupportRequestPreview: (i) => { audit.recordPreview('hr_support_request_preview', store.demoStaff()); return hrSupport.createHrSupportRequestPreview(i); },
  createMessageDraftPreview: (i) => { audit.recordPreview('message_draft_preview', store.demoStaff()); return drafts.createMessageDraftPreview(i); },
  getAuditPreview: audit.getAuditPreview,
};
