// lib/staffPortal/attendanceStatusPreview.js — Safe attendance preview. No check-in/out or attendance mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./staffPortalModel');

function getAttendanceStatusPreview(input = {}) {
  const { staff } = store.findStaffPreview(input);
  const a = staff.attendance || {};
  const warnings = [];
  if (a.monthLate > 0) warnings.push('late_marks_present');
  return safeResponse({
    liveAttendanceMutation: false,
    liveCheckIn: false,
    liveCheckOut: false,
    todayStatusPreview: `${a.todayStatus || 'unknown'}_preview`,
    monthPresentPreview: Number(a.monthPresent || 0),
    monthAbsentPreview: Number(a.monthAbsent || 0),
    monthLatePreview: Number(a.monthLate || 0),
    warnings,
  });
}
module.exports = { getAttendanceStatusPreview };
