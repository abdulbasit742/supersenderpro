// lib/staffPortal/approvalStatusPreview.js — Safe approval status preview. No approval mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./staffPortalModel');
const { maskRef, safeText } = require('./redactor');

function listApprovals(input = {}) {
  const { staff } = store.findStaffPreview(input);
  const warnings = [];
  const approvals = (staff.approvals || []).map((a) => {
    if (a.status === 'pending') warnings.push('approval_pending');
    return {
      approvalIdPreview: maskRef(a.id, 'apr'),
      typeSafe: safeText(a.type),
      statusPreview: `${a.status}_preview`,
    };
  });
  return safeResponse({ liveApprovalMutation: false, approvalsPreview: approvals, warnings });
}
function getApprovalStatusPreview(input = {}) {
  const list = listApprovals(input);
  return safeResponse({ liveApprovalMutation: false, approvalPreview: (list.approvalsPreview || [])[0] || {}, warnings: list.warnings });
}
module.exports = { listApprovals, getApprovalStatusPreview };
