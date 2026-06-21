// lib/vendorPortal/paymentSchedulePreview.js — Safe payment schedule preview. No payment action/mutation.
'use strict';
const store = require('./store');
const { safeResponse } = require('./vendorPortalModel');
const { maskRef } = require('./redactor');

function getPaymentSchedulePreview(input = {}) {
  const { vendor } = store.findVendorPreview(input);
  const items = (vendor.paymentSchedule || []).map((s) => ({
    scheduleIdPreview: maskRef(s.id, 'sch'),
    dueDatePreview: s.dueDate || '',
    amountPreview: Number(s.amount || 0),
    statusPreview: `${s.status || 'scheduled'}_preview`,
  }));
  return safeResponse({ livePaymentAction: false, paymentSchedulePreview: items });
}
module.exports = { getPaymentSchedulePreview };
