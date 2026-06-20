// lib/staffPortal/staffPortalService.js — Central service: portal status, lookup, and re-export of all previews.
// Everything is dry-run / preview-only. No external calls, no live mutations, no live sends, PII masked.
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
const tasks = require('./taskStatusPreview');
const sops = require('./sopStatusPreview');
const branch = require('./branchAssignmentPreview');
const approvals = require('./approvalStatusPreview');
const documents = require('./documentRequestPreview');
const contracts = require('./contractStatusPreview');
const hrSupport = require('./hrSupportRequestPreview');
const drafts = require('./messageDrafts');
const audit = require('./auditPreview');
const summary = require('./statusSummaryPreview');

const SUPPORTED_MODULES = [
  'profile', 'attendance', 'shifts', 'leave', 'payroll', 'payslips', 'commission',
  'expenses', 'tasks', 'sops', 'branch-assignment', 'approvals', 'documents', 'contracts',
];

// GET /status — always-safe capability + safety report.
function getStaffPortalStatus() {
  return model.safeResponse({
    liveActionsEnabled: false,
    staffPortalPublicLive: false,
    piiMasked: true,
    externalCallsEnabled: false,
    supportedModules: SUPPORTED_MODULES,
    accessModes: model.ACCESS_MODES,
    portalStatuses: model.PORTAL_STATUSES,
    employmentStatuses: model.EMPLOYMENT_STATUSES,
  });
}

// POST /lookup-preview — returns a masked session preview. No real auth, no live lookup.
function lookupStaffPreview(input = {}) {
  const { staff, accessMode } = store.findStaffPreview(input);
  const r = redactStaff(staff);
  audit.recordPreview('lookup_preview', staff, 'staff_portal');
  return model.safeResponse({
    liveAuthEnabled: false,
    lookupMode: accessMode,
    staffNameSafe: r.staffNameSafe,
    phoneMasked: r.phoneMasked,
    emailMasked: r.emailMasked,
    staffTokenPreview: 'staff_preview_****',
    warnings: ['auth_preview_only', 'pii_masked'],
  });
}

function getStaffSummaryPreview(input = {}) {
  audit.recordPreview('summary_preview', store.demoStaff(), 'staff_portal');
  return summary.getStaffSummaryPreview(input);
}

// Thin pass-throughs so every spec-named service function is available on one object.
function getProfileStatusPreview(i) { return profile.getProfileStatusPreview(i); }
function getAttendanceStatusPreview(i) { return attendance.getAttendanceStatusPreview(i); }
function getShiftStatusPreview(i) { return shift.getShiftStatusPreview(i); }
function getLeaveStatusPreview(i) { return leave.getLeaveStatusPreview(i); }
function createLeaveRequestPreview(i) { audit.recordPreview('leave_request_preview', store.demoStaff()); return leaveReq.createLeaveRequestPreview(i); }
function getPayrollSummaryPreview(i) { return payroll.getPayrollSummaryPreview(i); }
function getPayslipMetadataPreview(i) { return payslip.getPayslipMetadataPreview(i); }
function getCommissionSummaryPreview(i) { return commission.getCommissionSummaryPreview(i); }
function getExpenseStatusPreview(i) { return expense.getExpenseStatusPreview(i); }
function createExpenseRequestPreview(i) { audit.recordPreview('expense_request_preview', store.demoStaff()); return expenseReq.createExpenseRequestPreview(i); }
function getTaskStatusPreview(i) { return tasks.getTaskStatusPreview(i); }
function getSopStatusPreview(i) { return sops.getSopStatusPreview(i); }
function getBranchAssignmentPreview(i) { return branch.getBranchAssignmentPreview(i); }
function getApprovalStatusPreview(i) { return approvals.getApprovalStatusPreview(i); }
function getContractStatusPreview(i) { return contracts.getContractStatusPreview(i); }
function getDocumentStatusPreview(i) { return documents.getDocumentStatusPreview(i); }
function createDocumentRequestPreview(i) { audit.recordPreview('document_request_preview', store.demoStaff()); return documents.createDocumentRequestPreview(i); }
function createHrSupportRequestPreview(i) { audit.recordPreview('hr_support_request_preview', store.demoStaff()); return hrSupport.createHrSupportRequestPreview(i); }
function createMessageDraftPreview(i) { audit.recordPreview('message_draft_preview', store.demoStaff()); return drafts.createMessageDraftPreview(i); }
function getAuditPreview() { return audit.getAuditPreview(); }

module.exports = {
  SUPPORTED_MODULES,
  getStaffPortalStatus,
  lookupStaffPreview,
  getStaffSummaryPreview,
  getProfileStatusPreview,
  getAttendanceStatusPreview, listAttendance: attendance.listAttendance, getAttendanceItemStatusPreview: attendance.getAttendanceStatusPreview,
  getShiftStatusPreview, listShifts: shift.listShifts,
  getLeaveStatusPreview, listLeave: leave.listLeave, getLeaveItemStatusPreview: leave.getLeaveItemStatusPreview,
  createLeaveRequestPreview,
  getPayrollSummaryPreview, listPayroll: payroll.listPayroll,
  getPayslipMetadataPreview, listPayslips: payslip.listPayslips,
  getCommissionSummaryPreview,
  getExpenseStatusPreview, listExpenses: expense.listExpenses,
  createExpenseRequestPreview,
  getTaskStatusPreview, listTasks: tasks.listTasks, getTaskItemStatusPreview: tasks.getTaskItemStatusPreview,
  getSopStatusPreview,
  getBranchAssignmentPreview,
  getApprovalStatusPreview, listApprovals: approvals.listApprovals,
  getContractStatusPreview, listContracts: contracts.listContracts,
  getDocumentStatusPreview, listDocuments: documents.listDocuments,
  createDocumentRequestPreview,
  createHrSupportRequestPreview,
  createMessageDraftPreview,
  getAuditPreview,
};
