// lib/staffPortal/branchAssignmentPreview.js — Safe branch assignment preview. No mutation.
'use strict';

const store = require('./store');
const { safeResponse } = require('./staffPortalModel');
const { maskName } = require('./redactor');

function getBranchAssignmentPreview(input = {}) {
  const { staff } = store.findStaffPreview(input);
  const warnings = [];
  if (!staff.branch) warnings.push('branch_assignment_missing');
  return safeResponse({
    liveBranchMutation: false,
    staffMasked: maskName(staff.name),
    branchSafe: 'branch_preview',
    roleSafe: 'employee_preview',
    warnings,
  });
}

module.exports = { getBranchAssignmentPreview };
