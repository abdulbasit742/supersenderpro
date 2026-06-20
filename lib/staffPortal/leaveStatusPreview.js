// lib/staffPortal/leaveStatusPreview.js — Safe leave balance + request status previews. No leave/approval mutation.
'use strict';

const store = require('./store');
const { safeResponse } = require('./staffPortalModel');
const { maskName, maskRef } = require('./redactor');

function listLeave(input = {}) {
  return getLeaveStatusPreview(input);
}

function getLeaveStatusPreview(input = {}) {
  const { staff } = store.findStaffPreview(input);
  const l = staff.leave || {};
  const warnings = [];
  const annual = Number(l.annual || 0);
  if (annual <= 2) warnings.push('leave_balance_low');
  const pending = (l.requests || []).map((r) => ({
    leaveIdPreview: maskRef(r.id || 'lv', 'lv'),
    leaveTypePreview: `${r.type || 'annual'}_leave_preview`,
    statusPreview: `${r.status || 'pending'}_preview`,
    requestedDatesPreview: r.dates || [],
  }));
  if (pending.length) warnings.push('leave_request_pending');
  return safeResponse({
    liveLeaveMutation: false,
    liveApprovalMutation: false,
    staffMasked: maskName(staff.name),
    leaveBalancePreview: {
      annualLeavePreview: annual,
      sickLeavePreview: Number(l.sick || 0),
      casualLeavePreview: Number(l.casual || 0),
    },
    pendingRequestsPreview: pending,
    warnings,
  });
}

function getLeaveItemStatusPreview(input = {}) {
  const list = getLeaveStatusPreview(input);
  const first = (list.pendingRequestsPreview || [])[0] || {};
  return safeResponse({
    liveLeaveMutation: false,
    liveApprovalMutation: false,
    staffMasked: list.staffMasked,
    leaveRequestPreview: first,
    warnings: list.warnings,
  });
}

module.exports = { listLeave, getLeaveStatusPreview, getLeaveItemStatusPreview };
