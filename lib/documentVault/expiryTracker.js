 'use strict';
 /**
     * expiryTracker.js — surfaces expired + expiring-soon documents. Pure over a list.
     */
 function daysTo(dateStr) { if (!dateStr) return null; return Math.ceil((new Date(dateStr).getTime() - Date.now()) /
 86400000); }
 function alerts(documents, withinDays) {
   const within = Number(withinDays) || 30;
      const expired = [];
      const expiringSoon = [];
      (documents || []).forEach((d) => {

        const days = daysTo(d.expiryDate);
        if (days == null) return;
        if (days < 0) expired.push({ id: d.id, title: d.title, documentType: d.documentType, expiryDate: d.expiryDate,
 daysOverdue: Math.abs(days) });
     else if (days <= within) expiringSoon.push({ id: d.id, title: d.title, documentType: d.documentType, expiryDate:
 d.expiryDate, daysLeft: days });
   });
      return { ok: true, dryRun: true, expiredPreview: expired, expiringSoonPreview: expiringSoon, withinDays: within };
 }
 module.exports = { alerts, daysTo };
