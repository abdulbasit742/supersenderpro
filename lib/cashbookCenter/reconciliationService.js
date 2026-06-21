  'use strict';
  /**
   * reconciliationService.js — preview reconciliation between cashbook transactions
   * and a supplied statement (bank/JazzCash/EasyPaisa). Never writes/reconciles live.
   */
  const duplicateDetector = require('./duplicateDetector');


  function reconcile(transactions, statementLines) {
    const txns = transactions || [];
    const stmt = statementLines || [];
    const stmtTotal = stmt.reduce((a, s) => a + (Number(s.amount) || 0), 0);
    const bookTotal = txns.reduce((a, t) => a + ((t.direction === 'cash_in' ? 1 : -1) * (Number(t.amount) || 0)), 0);


    // naive match: a txn is matched if a statement line shares amount + ref tail
    let matched = 0;
    txns.forEach((t) => {
      const refT = String(t.referenceMasked || '').replace(/\*/g, '');
      const hit = stmt.find((s) => (Number(s.amount) || 0) === (Number(t.amount) || 0) && (!refT || String(s.reference ||
  '').slice(-2) === refT.slice(-2)));

         if (hit) matched++;
       });
       const unmatched = txns.length - matched;
       const dup = duplicateDetector.check(txns);
       return {
         ok: true, dryRun: true, liveReconcile: false,
         matchedTransactionsPreview: matched,
         unmatchedTransactionsPreview: unmatched,
         duplicateRisksPreview: dup.duplicateRisksPreview,
         balanceDifferencePreview: Math.round((stmtTotal - bookTotal) * 100) / 100,
         warnings: unmatched > 0 ? ['unmatched_transactions_remain'] : [],
         blockers: [],
       };
  }
  module.exports = { reconcile };
