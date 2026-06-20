// lib/staffPortal/taskStatusPreview.js — Safe assigned-task previews. No task mutation.
'use strict';

const store = require('./store');
const { safeResponse } = require('./staffPortalModel');
const { maskName, maskRef, safeText } = require('./redactor');

function listTasks(input = {}) {
  return getTaskStatusPreview(input);
}

function getTaskStatusPreview(input = {}) {
  const { staff } = store.findStaffPreview(input);
  const tasks = staff.tasks || [];
  const warnings = [];
  const assigned = tasks.map((t) => ({
    taskIdPreview: maskRef(t.id || 'task', 'task'),
    titleSafe: safeText(t.title || 'task'),
    statusPreview: `${t.status || 'open'}_preview`,
    overdue: !!t.overdue,
  }));
  const overdue = assigned.filter((t) => t.overdue);
  if (overdue.length) warnings.push('task_overdue');
  return safeResponse({
    liveTaskMutation: false,
    staffMasked: maskName(staff.name),
    assignedTasksPreview: assigned,
    overdueTasksPreview: overdue,
    warnings,
  });
}

function getTaskItemStatusPreview(input = {}) {
  const list = getTaskStatusPreview(input);
  const first = (list.assignedTasksPreview || [])[0] || {};
  return safeResponse({ liveTaskMutation: false, staffMasked: list.staffMasked, taskPreview: first, warnings: list.warnings });
}

module.exports = { listTasks, getTaskStatusPreview, getTaskItemStatusPreview };
