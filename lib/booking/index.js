// lib/booking/index.js — Appointment Booking (barrel export).
//
// Define bookable services (duration, optional staff, weekly availability windows), generate
// conflict-free bookable slots for a date (timezone-aware, respecting working hours + min lead +
// existing bookings), and book/cancel/reschedule atomically without double-booking. Fires
// (draft-only) confirmations on booking and one-time reminders N hours before. Pairs with consent
// #38 (outbound gated), customer 360 #46 (booking event), scheduler #17 / tasks #54.
//
// SAFETY: JSON-backed; slot math + booking are local + deterministic. Outbound confirmation/
// reminder messages are DRAFT-ONLY until BOOKING_LIVE_MESSAGES=true AND a notifier is wired via
// require('./lib/booking').setNotifier(fn); consent is honored on outbound. Contacts masked in views.

const { config, STATUSES } = require('./config');
const notify = require('./notify');

module.exports = {
 config, STATUSES,
 store: require('./store'),
 privacy: require('./privacy'),
 timezone: require('./timezone'),
 serviceStore: require('./serviceStore'),
 availability: require('./availability'),
 notify,
 bookingEngine: require('./bookingEngine'),
 doctor: require('./doctor'),
 setNotifier: notify.setNotifier,
};
