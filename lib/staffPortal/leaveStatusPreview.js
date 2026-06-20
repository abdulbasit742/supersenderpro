// lib/staffPortal/leaveStatusPreview.js — Safe leave balance preview. No leave mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./staffPortalModel');

function getLeaveStatusPreview(input = {}) {
  const { staff } = store.findStaffPreview(input);
  const l = staff.leave || {};
  const warnings = [];
  if (l.pending > 0) warnings.push('pending_leave_request');
  if (l.annualBalance <= 2) warnings.push('low_leave_balance');
  return safeResponse({
    liveLeaveMutation: false,
    liveApprovalMutation: false,
    annualTotalPreview: Number(l.annualTotal || 0),
    annualUsedPreview: Number(l.annualUsed || 0),
    annualBalancePreview: Number(l.annualBalance || 0),
    sickBalancePreview: Number(l.sickBalance || 0),
    pendingRequestsPreview: Number(l.pending || 0),
    warnings,
  });
}
module.exports = { getLeaveStatusPreview };
