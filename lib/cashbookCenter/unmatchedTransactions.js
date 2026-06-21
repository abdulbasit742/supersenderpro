  'use strict';
  /**
   * unmatchedTransactions.js — surfaces transactions still needing a match/review.
   */
  function find(transactions) {
    return (transactions || [])
      .filter((t) => ['unmatched', 'partial_match_preview', 'needs_review'].includes(t.matchStatus))
      .map((t) => ({ id: t.id, transactionDate: t.transactionDate, amount: t.amount, method: t.method, direction:
  t.direction, source: t.source, matchStatus: t.matchStatus, referenceMasked: t.referenceMasked }));
  }
  module.exports = { find };
