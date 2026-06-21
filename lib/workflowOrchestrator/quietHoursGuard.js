// lib/workflowOrchestrator/quietHoursGuard.js — preview-only business/quiet hours check.
 'use strict';
 const cfg = require('./config');
 function quietHoursGuard(input) {
   const i = input || {};
     const hour = typeof i.hour === 'number' ? i.hour : new Date().getHours();
     const start = Number.isFinite(i.businessStart) ? i.businessStart : 9;
     const end = Number.isFinite(i.businessEnd) ? i.businessEnd : 21;
     const inBusiness = hour >= start && hour < end;
     return cfg.base({
       businessHoursPreview: inBusiness, quietHoursPreview: !inBusiness,
     blockedPreview: !inBusiness, reasonPreview: inBusiness ? 'within_business_hours_preview' :
 'quiet_hours_blocked_preview',
     });
 }
 module.exports = { quietHoursGuard };
