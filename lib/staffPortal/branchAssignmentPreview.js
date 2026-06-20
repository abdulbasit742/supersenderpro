// lib/staffPortal/branchAssignmentPreview.js — Safe branch assignment preview.
'use strict';
const store = require('./store');
const { safeResponse } = require('./staffPortalModel');
const { safeText, maskName } = require('./redactor');

function getBranchAssignmentPreview(input = {}) {
  const { staff } = store.findStaffPreview(input);
  const b = staff.branchAssignment || {};
  return safeResponse({
    liveAssignmentMutation: false,
    branchSafe: safeText(b.branch || ''),
    shiftPatternSafe: safeText(b.shiftPattern || ''),
    managerSafe: maskName(b.manager || ''),
  });
}
module.exports = { getBranchAssignmentPreview };
