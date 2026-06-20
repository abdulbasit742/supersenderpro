// lib/staffPortal/taskStatusPreview.js — Safe assigned-task status preview. No task mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./staffPortalModel');
const { maskRef, safeText } = require('./redactor');

function listTasks(input = {}) {
  const { staff } = store.findStaffPreview(input);
  const tasks = (staff.tasks || []).map((t) => ({
    taskIdPreview: maskRef(t.id, 'tsk'),
    titleSafe: safeText(t.title),
    statusPreview: `${t.status}_preview`,
    duePreview: t.due || '',
  }));
  return safeResponse({ liveTaskMutation: false, tasksPreview: tasks });
}
function getTaskStatusPreview(input = {}) {
  const list = listTasks(input);
  return safeResponse({ liveTaskMutation: false, taskPreview: (list.tasksPreview || [])[0] || {} });
}
module.exports = { listTasks, getTaskStatusPreview };
