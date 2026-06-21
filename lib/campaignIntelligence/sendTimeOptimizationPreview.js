// lib/campaignIntelligence/sendTimeOptimizationPreview.js — best/worst send windows preview. No schedule mutation.
 'use strict';
 const cfg = require('./config');
 const { seeded } = require('./config');


 function sendTimeOptimization(input) {
   const i = input || {};
     const rnd = seeded((i.segment || 'all') + ':sendtime');
     const hours = [];
     for (let h = 8; h <= 22; h++) hours.push({ hourPreview: h, engagementScorePreview: Number((rnd()).toFixed(3)) });
     const sorted = hours.slice().sort((a, b) => b.engagementScorePreview - a.engagementScorePreview);
     return cfg.base({
       liveScheduleMutation: false,
       recommendedWindowsPreview: sorted.slice(0, 3).map((h) => h.hourPreview + ':00'),
       worstWindowsPreview: sorted.slice(-3).map((h) => h.hourPreview + ':00'),
       timezonePreview: 'business_timezone_preview', confidencePreview: 0.62,
     });
 }
 module.exports = { sendTimeOptimization };
