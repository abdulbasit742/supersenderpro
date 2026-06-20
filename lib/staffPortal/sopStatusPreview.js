// lib/staffPortal/sopStatusPreview.js — Safe SOP checklist previews. No task mutation.
'use strict';

const store = require('./store');
const { safeResponse } = require('./staffPortalModel');
const { maskRef, safeText } = require('./redactor');

function getSopStatusPreview(input = {}) {
  const { staff } = store.findStaffPreview(input);
  const sops = staff.sops || [];
  const warnings = [];
  const checklists = sops.map((s) => ({
    sopIdPreview: maskRef(s.id || 'sop', 'sop'),
    titleSafe: safeText(s.title || 'SOP'),
    statusPreview: `${s.status || 'pending'}_preview`,
  }));
  const completed = checklists.filter((s) => s.statusPreview === 'completed_preview').length;
  const pending = checklists.length - completed;
  if (pending > 0) warnings.push('sop_pending');
  return safeResponse({
    liveTaskMutation: false,
    sopChecklistsPreview: checklists,
    completedTodayPreview: completed,
    pendingTodayPreview: pending,
    warnings,
  });
}

module.exports = { getSopStatusPreview };
