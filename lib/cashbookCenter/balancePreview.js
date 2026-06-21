  'use strict';
  /**
      * balancePreview.js — opening/closing balance + cash-in/out previews. Pure over
      * a supplied transaction list. No mutation.
      */

  function compute(transactions, openingBalance) {
    const list = transactions || [];
    const cashInPreview = list.filter((t) => t.direction === 'cash_in').reduce((a, t) => a + (Number(t.amount) || 0), 0);
    const cashOutPreview = list.filter((t) => t.direction === 'cash_out').reduce((a, t) => a + (Number(t.amount) || 0), 0);
    const openingBalancePreview = Number(openingBalance) || 0;
    const closingBalancePreview = openingBalancePreview + cashInPreview - cashOutPreview;
    const unmatchedCount = list.filter((t) => t.matchStatus === 'unmatched').length;
    const warnings = [];
    if (closingBalancePreview < 0) warnings.push('negative_closing_balance_preview');
    if (unmatchedCount > 0) warnings.push('unmatched_transactions_present');
    return { ok: true, dryRun: true, openingBalancePreview, cashInPreview, cashOutPreview, closingBalancePreview,
  unmatchedCount, warnings, blockers: [] };
  }
  module.exports = { compute };
