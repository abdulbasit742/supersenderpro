// lib/staffPortal/leaveRequestPreview.js — Draft a leave request PREVIEW. Never submits or approves leave.
'use strict';

const store = require('./store');
const { safeResponse } = require('./staffPortalModel');
const { maskName, safeText } = require('./redactor');

function createLeaveRequestPreview(input = {}) {
  const { staff } = store.findStaffPreview(input);
  const dates = Array.isArray(input.dates) ? input.dates.map((d) => safeText(d)) : [];
  return safeResponse({
    liveLeaveMutation: false,
    liveApprovalMutation: false,
    staffMasked: maskName(staff.name),
    leaveTypePreview: `${safeText(input.leaveType || 'annual')}_leave_preview`,
    requestedDatesPreview: dates,
    balanceImpactPreview: dates.length || 0,
    approvalRequiredPreview: true,
    notePreview: safeText(input.note || 'Leave request draft — nothing is submitted. Contact HR/admin to apply.'),
    warnings: ['leave_request_pending'],
  });
}

module.exports = { createLeaveRequestPreview };
