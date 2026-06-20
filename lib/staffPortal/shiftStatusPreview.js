// lib/staffPortal/shiftStatusPreview.js — Safe shift schedule preview. No shift mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./staffPortalModel');
const { maskRef, safeText } = require('./redactor');

function listShifts(input = {}) {
  const { staff } = store.findStaffPreview(input);
  const shifts = (staff.shifts || []).map((s) => ({
    shiftIdPreview: maskRef(s.id, 'shf'),
    daySafe: safeText(s.day),
    timeSafe: safeText(s.time),
    statusPreview: `${s.status}_preview`,
  }));
  return safeResponse({ liveShiftMutation: false, shiftsPreview: shifts });
}
function getShiftStatusPreview(input = {}) {
  const list = listShifts(input);
  return safeResponse({ liveShiftMutation: false, shiftPreview: (list.shiftsPreview || [])[0] || {} });
}
module.exports = { listShifts, getShiftStatusPreview };
