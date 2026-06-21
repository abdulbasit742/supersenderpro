 'use strict';
 const { make } = require('./_statusPreviewFactory');
 module.exports = { forToken: make('appointment', { attention: ['pending'], detail: (c) => ({ liveBookingMutation: false,
 note: 'Appointment status preview only; no booking change.' }) }) };
