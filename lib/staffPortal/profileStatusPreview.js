// lib/staffPortal/profileStatusPreview.js — Safe staff profile preview. No profile mutation. PII masked.
'use strict';

const store = require('./store');
const { safeResponse } = require('./staffPortalModel');
const { redactStaff } = require('./redactor');

function getProfileStatusPreview(input = {}) {
  const { staff } = store.findStaffPreview(input);
  const r = redactStaff(staff);
  const warnings = ['pii_masked'];
  if (!staff.phone && !staff.email) warnings.push('missing_staff_contact');
  return safeResponse({
    liveProfileMutation: false,
    staffNameSafe: r.staffNameSafe,
    phoneMasked: r.phoneMasked,
    emailMasked: r.emailMasked,
    roleSafe: 'employee_preview',
    branchSafe: 'branch_preview',
    employmentStatusPreview: `${staff.employmentStatus || 'active'}_preview`,
    cnicMasked: r.cnicMasked,
    warnings,
  });
}

module.exports = { getProfileStatusPreview };
