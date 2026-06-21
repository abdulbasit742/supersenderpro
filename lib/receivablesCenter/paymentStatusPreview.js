  'use strict';

  /** Receivables Center — payment status + overdue derivation (preview). */

  const store = require('./store');


  function daysBetween(a, b) { return Math.floor((a - b) / (1000 * 60 * 60 * 24)); }

  /** Recompute overdue flags based on dueDate vs now (read-only view). */
  function statusView() {
    const now = Date.now();
      return store.readInvoices().map((inv) => {
        let status = inv.status;
      const overdue = inv.dueDate && inv.balanceDuePreview > 0 && new Date(inv.dueDate).getTime() < now && status !==
  'paid_preview' && status !== 'cancelled_preview';
       if (overdue) status = 'overdue_preview';
       return { id: inv.id, invoiceNumber: inv.invoiceNumber, status, balanceDuePreview: inv.balanceDuePreview, daysOverdue:
  overdue ? daysBetween(now, new Date(inv.dueDate).getTime()) : 0 };
    });
  }

  module.exports = { statusView, daysBetween };
