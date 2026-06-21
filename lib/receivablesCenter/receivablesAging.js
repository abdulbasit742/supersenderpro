  'use strict';

  /** Receivables Center — aging buckets (preview). */

  const store = require('./store');
  const { daysBetween } = require('./paymentStatusPreview');

  const BUCKETS = ['current', 'due_1_7_days', 'due_8_30_days', 'due_31_60_days', 'due_61_90_days', 'due_90_plus_days'];

  function bucketFor(daysOverdue) {
    if (daysOverdue <= 0) return 'current';
      if (daysOverdue <= 7) return 'due_1_7_days';
      if (daysOverdue <= 30) return 'due_8_30_days';
      if (daysOverdue <= 60) return 'due_31_60_days';
      if (daysOverdue <= 90) return 'due_61_90_days';
      return 'due_90_plus_days';


  }

  function aging() {
      const now = Date.now();
      const totals = {}; for (const b of BUCKETS) totals[b] = { count: 0, amountPreview: 0 };
      for (const inv of store.readInvoices()) {
        if (!(inv.balanceDuePreview > 0) || inv.status === 'cancelled_preview' || inv.status === 'paid_preview') continue;
          const days = inv.dueDate ? daysBetween(now, new Date(inv.dueDate).getTime()) : 0;
          const b = bucketFor(days);
          totals[b].count += 1;
          totals[b].amountPreview = Math.round((totals[b].amountPreview + inv.balanceDuePreview) * 100) / 100;
      }
      const overdueAmount = BUCKETS.filter((b) => b !== 'current').reduce((s, b) => s + totals[b].amountPreview, 0);
      let risk = 'low';
      if (totals.due_90_plus_days.amountPreview > 0 || totals.due_61_90_days.amountPreview > 0) risk = 'high';
      else if (overdueAmount > 0) risk = 'medium';
      return { ok: true, dryRun: true, buckets: totals, overdueAmountPreview: Math.round(overdueAmount * 100) / 100,
  receivablesRiskLevel: risk };
  }


  module.exports = { BUCKETS, bucketFor, aging };
