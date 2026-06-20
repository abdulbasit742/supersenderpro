// lib/staffPortal/leaveRequestPreview.js — Safe leave-request DRAFT. Never mutates leave or triggers approval.
'use strict';
const { safeResponse } = require('./staffPortalModel');
const { safeText } = require('./redactor');

function createLeaveRequestPreview(input = {}) {
  const blockers = [];
  if (!input.from || !input.to) blockers.push('missing_leave_dates');
  return safeResponse({
    liveLeaveMutation: false,
    liveApprovalMutation: false,
    requestPreview: {
      typeSafe: safeText(input.type || 'annual'),
      fromSafe: safeText(input.from || ''),
      toSafe: safeText(input.to || ''),
      reasonSafe: safeText(input.reason || ''),
      statusPreview: 'leave_request_preview',
    },
    blockers,
  });
}
module.exports = { createLeaveRequestPreview };
