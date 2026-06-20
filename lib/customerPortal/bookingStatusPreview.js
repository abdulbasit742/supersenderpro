// lib/customerPortal/bookingStatusPreview.js — Safe booking/appointment previews. No calendar or booking mutation.
'use strict';

const store = require('./store');
const { safeResponse } = require('./customerPortalModel');
const { maskRef, maskName } = require('./redactor');

function listBookings(input = {}) {
  const { customer } = store.findCustomerPreview(input);
  const bookings = (customer.bookings || []).map((b) => ({
    bookingIdPreview: maskRef(b.id, 'book'),
    statusPreview: `${b.status}_preview`,
    scheduledTimePreview: b.time || '',
    assignedStaffSafe: maskName(b.staff),
  }));
  return safeResponse({ liveCalendarWrite: false, liveBookingMutation: false, bookingsPreview: bookings });
}

function getBookingStatusPreview(input = {}) {
  const { customer } = store.findCustomerPreview(input);
  const b = (customer.bookings || [])[0] || {};
  const warnings = [];
  if (b.time && new Date(b.time).getTime() - Date.now() < 3 * 86400000) warnings.push('appointment_due');
  return safeResponse({
    liveCalendarWrite: false,
    liveBookingMutation: false,
    bookingIdPreview: maskRef(b.id || 'book', 'book'),
    statusPreview: `${b.status || 'unknown'}_preview`,
    scheduledTimePreview: b.time || '',
    assignedStaffSafe: maskName(b.staff),
    warnings,
  });
}

module.exports = { listBookings, getBookingStatusPreview };
