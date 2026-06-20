// lib/staffPortal/approvalStatusPreview.js — Safe approval status previews. No approval mutation.
'use strict';

const store = require('./store');
const { safeResponse } = require('./staffPortalModel');
const { maskRef, safeText } = require('./redactor');

function listApprovals(input = {}) {
  return getApprovalStatusPreview(input);
}

function getApprovalStatusPreview(input = {}) {
  const { staff } = store.findStaffPreview(input);
  const warnings = [];
  const approvals = (staff.approvals || []).map((a) => {
    if ((a.status || 'pending') === 'pending') warnings.push('approval_pending');
    return {
      approvalIdPreview: maskRef(a.id || 'apr', 'apr'),
      typeSafe: safeText(a.type || 'general'),
      statusPreview: `${a.status || 'pending'}_preview`,
    };
  });
  return safeResponse({
    liveApprovalMutation: false,
    pendingApprovalsPreview: approvals,
    warnings: [...new Set(warnings)],
  });
}

module.exports = { listApprovals, getApprovalStatusPreview };
