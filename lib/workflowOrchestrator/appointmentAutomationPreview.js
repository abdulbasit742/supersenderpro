// lib/workflowOrchestrator/appointmentAutomationPreview.js — appointment confirmation draft preview.
 'use strict';
 const cfg = require('./config');
 const { maskMessage } = require('./redactor');
 const { quietHoursGuard } = require('./quietHoursGuard');
 function appointmentAutomationPreview(input) {
   const i = input || {};
     const qh = quietHoursGuard({ hour: i.hour });
     return cfg.base({
       liveBookingMutation: false, liveSend: false,
       appointmentConfirmationDraftPreview: maskMessage(i.message || 'Aap ki appointment confirm preview hai.'),
       slotPreview: i.slot || 'next_available_preview',
       withinBusinessHoursPreview: qh.businessHoursPreview,
     });
 }
 module.exports = { appointmentAutomationPreview };
