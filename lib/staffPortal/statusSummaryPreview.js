// lib/staffPortal/statusSummaryPreview.js — Aggregated, masked staff summary. Resilient if a module is missing.
'use strict';

const store = require('./store');
const { safeResponse } = require('./staffPortalModel');
const { redactStaff } = require('./redactor');

// Safely run a producer; on any error push a module_not_available warning and return a fallback.
function safeCall(label, fn, fallback, warnings) {
  try {
    return fn();
  } catch (e) {
    warnings.push(`module_not_available:${label}`);
    return fallback;
  }
}

function getStaffSummaryPreview(input = {}) {
  const warnings = [];
  const { staff } = store.findStaffPreview(input);
  const r = redactStaff(staff);

  const attendance = safeCall('attendance', () => require('./attendanceStatusPreview').getAttendanceStatusPreview(input), {}, warnings);
  const shift = safeCall('shift', () => require('./shiftStatusPreview').getShiftStatusPreview(input), {}, warnings);
  const leave = safeCall('leave', () => require('./leaveStatusPreview').getLeaveStatusPreview(input), {}, warnings);
  const payroll = safeCall('payroll', () => require('./payrollSummaryPreview').getPayrollSummaryPreview(input), {}, warnings);
  const commission = safeCall('commission', () => require('./commissionSummaryPreview').getCommissionSummaryPreview(input), {}, warnings);
  const expenses = safeCall('expenses', () => require('./expenseStatusPreview').listExpenses(input).expensesPreview, [], warnings);
  const tasks = safeCall('tasks', () => require('./taskStatusPreview').getTaskStatusPreview(input), {}, warnings);
  const approvals = safeCall('approvals', () => require('./approvalStatusPreview').getApprovalStatusPreview(input).pendingApprovalsPreview, [], warnings);
  const documents = safeCall('documents', () => require('./documentRequestPreview').listDocuments(input).documentsPreview, [], warnings);
  const contracts = safeCall('contracts', () => require('./contractStatusPreview').listContracts(input).contractsPreview, [], warnings);

  if (!staff.phone && !staff.email) warnings.push('missing_staff_contact');
  warnings.push('pii_masked');

  const pendingLeave = (leave.pendingRequestsPreview || []);
  const assignedTasks = (tasks.assignedTasksPreview || []);
  const overdueTasks = (tasks.overdueTasksPreview || []);

  return safeResponse({
    liveActionsEnabled: false,
    staffPortalPublicLive: false,
    piiMasked: true,
    staffNameSafe: r.staffNameSafe,
    phoneMasked: r.phoneMasked,
    emailMasked: r.emailMasked,
    roleSafe: 'employee_preview',
    branchSafe: 'branch_preview',
    attendanceTodayPreview: attendance.statusPreview || 'unknown_preview',
    shiftTodayPreview: shift.shiftNamePreview || '',
    leaveBalancePreview: leave.leaveBalancePreview || {},
    pendingLeaveRequestsPreview: pendingLeave.length,
    payrollSummaryPreview: payroll.paymentStatusPreview || 'preview_only',
    commissionSummaryPreview: commission.payoutStatusPreview || 'pending_preview',
    openExpenseClaimsPreview: expenses.length,
    assignedTasksPreview: assignedTasks.length,
    overdueTasksPreview: overdueTasks.length,
    pendingApprovalsPreview: approvals.length,
    pendingDocumentsPreview: documents.filter((d) => d.statusPreview === 'missing').length,
    contractStatusPreview: (contracts[0] && contracts[0].statusPreview) || 'none_preview',
    warnings: [...new Set(warnings)],
  });
}

module.exports = { getStaffSummaryPreview };
