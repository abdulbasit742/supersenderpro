// lib/staffPortal/profileStatusPreview.js — Safe staff profile summary (masked).
'use strict';
const store = require('./store');
const { safeResponse } = require('./staffPortalModel');
const { redactStaff } = require('./redactor');

function getProfilePreview(input = {}) {
  const { staff } = store.findStaffPreview(input);
  const r = redactStaff(staff);
  return safeResponse({
    piiMasked: true,
    staffNameSafe: r.staffNameSafe,
    phoneMasked: r.phoneMasked,
    emailMasked: r.emailMasked,
    cnicMasked: r.cnicMasked,
    roleSafe: r.roleSafe,
    branchSafe: r.branchSafe,
  });
}
module.exports = { getProfilePreview };
