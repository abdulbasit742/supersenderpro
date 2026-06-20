// lib/staffPortal/shiftStatusPreview.js — Safe shift previews. No shift mutation.
'use strict';

const store = require('./store');
const { safeResponse } = require('./staffPortalModel');
const { maskName, maskRef } = require('./redactor');

function listShifts(input = {}) {
  const { staff } = store.findStaffPreview(input);
  const s = staff.shift || {};
  const shifts = [{
    shiftIdPreview: maskRef(s.id || 'shift', 'shift'),
    shiftNamePreview: `${s.name || 'Shift'} Preview`,
    startTimePreview: s.start || '',
    endTimePreview: s.end || '',
    branchSafe: 'branch_preview',
  }];
  return safeResponse({ liveShiftMutation: false, shiftsPreview: shifts });
}

function getShiftStatusPreview(input = {}) {
  const { staff } = store.findStaffPreview(input);
  const s = staff.shift || {};
  const warnings = [];
  if (!s.id) warnings.push('shift_missing');
  return safeResponse({
    liveShiftMutation: false,
    staffMasked: maskName(staff.name),
    shiftIdPreview: maskRef(s.id || 'shift', 'shift'),
    shiftNamePreview: `${s.name || 'Morning'} Preview`,
    startTimePreview: s.start || '',
    endTimePreview: s.end || '',
    branchSafe: 'branch_preview',
    warnings,
  });
}

module.exports = { listShifts, getShiftStatusPreview };
