// lib/staffPortal/attendanceStatusPreview.js — Safe attendance previews. No check-in/check-out mutation, ever.
'use strict';

const store = require('./store');
const { safeResponse } = require('./staffPortalModel');
const { maskName } = require('./redactor');

function listAttendance(input = {}) {
  const { staff } = store.findStaffPreview(input);
  const a = staff.attendance || {};
  const records = [{
    attendanceDatePreview: a.date || '',
    statusPreview: `${a.status || 'unknown'}_preview`,
    late: !!a.late,
  }];
  return safeResponse({ liveAttendanceMutation: false, attendancePreview: records });
}

function getAttendanceStatusPreview(input = {}) {
  const { staff } = store.findStaffPreview(input);
  const a = staff.attendance || {};
  const warnings = [];
  if (!a.date) warnings.push('attendance_missing');
  if (a.late) warnings.push('late_arrival_preview');
  if (a.status === 'absent') warnings.push('absent_preview');
  return safeResponse({
    liveAttendanceMutation: false,
    liveCheckIn: false,
    liveCheckOut: false,
    staffMasked: maskName(staff.name),
    attendanceDatePreview: a.date || '',
    checkInPreview: a.checkIn || '',
    checkOutPreview: a.checkOut || '',
    statusPreview: `${a.status || 'present'}_preview`,
    warnings,
  });
}

module.exports = { listAttendance, getAttendanceStatusPreview };
