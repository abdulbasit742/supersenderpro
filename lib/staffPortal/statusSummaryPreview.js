// lib/staffPortal/statusSummaryPreview.js — Aggregated, masked staff summary. Resilient if a module is missing.
'use strict';
const store = require('./store');
const { safeResponse } = require('./staffPortalModel');
const { redactStaff } = require('./redactor');

function safeCall(label, fn, fallback, warnings) {
  try { return fn(); } catch (e) { warnings.push(`module_not_available:${label}`); return fallback; }
}

function getStaffSummaryPreview(input = {}) {
  const warnings = [];
  const { staff } = store.findStaffPreview(input);
  const r = redactStaff(staff);

  const attendance = safeCall('attendance', () => require('./attendanceStatusPreview').getAttendanceStatusPreview(input), {}, warnings);
  const leave = safeCall('leave', () => require('./leaveStatusPreview').getLeaveStatusPreview(input), {}, warnings);
  const tasks = safeCall('tasks', () => require('./taskStatusPreview').listTasks(input).tasksPreview, [], warnings);
  const sops = safeCall('sops', () => require('./sopStatusPreview').listSops(input).sopsPreview, [], warnings);
  const expenses = safeCall('expenses', () => require('./expenseStatusPreview').listExpenses(input).expensesPreview, [], warnings);
  const approvals = safeCall('approvals', () => require('./approvalStatusPreview').listApprovals(input).approvalsPreview, [], warnings);
  const documents = safeCall('documents', () => require('./documentRequestPreview').listDocuments(input).documentsPreview, [], warnings);

  warnings.push('pii_masked');

  return safeResponse({
    staffPortalPublicLive: false,
    piiMasked: true,
    staffNameSafe: r.staffNameSafe,
    phoneMasked: r.phoneMasked,
    emailMasked: r.emailMasked,
    roleSafe: r.roleSafe,
    branchSafe: r.branchSafe,
    attendanceTodayPreview: attendance.todayStatusPreview || 'unknown_preview',
    leaveBalancePreview: leave.annualBalancePreview != null ? leave.annualBalancePreview : 0,
    openTasksPreview: tasks.filter((t) => t.statusPreview !== 'done_preview').length,
    incompleteSopsPreview: sops.filter((s) => s.statusPreview === 'incomplete_preview').length,
    pendingExpensesPreview: expenses.filter((e) => e.statusPreview === 'pending_preview').length,
    pendingApprovalsPreview: approvals.filter((a) => a.statusPreview === 'pending_preview').length,
    pendingDocumentsPreview: documents.filter((d) => d.statusPreview === 'missing').length,
    warnings: [...new Set(warnings)],
  });
}
module.exports = { getStaffSummaryPreview };
