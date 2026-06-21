  'use strict';
  /**
   * duplicateDetector.js — flags likely duplicate payments (same amount + ref tail
   * + close dates + same direction). Preview-only.
   */
  function check(transactions) {
    const list = transactions || [];
    const dupes = [];
    for (let i = 0; i < list.length; i++) {
      for (let k = i + 1; k < list.length; k++) {
        const a = list[i], b = list[k];
          if (a.id === b.id) continue;
          const sameAmount = (Number(a.amount) || 0) === (Number(b.amount) || 0) && a.amount;
          const refA = String(a.referenceMasked || '').replace(/\*/g, '');
          const refB = String(b.referenceMasked || '').replace(/\*/g, '');
          const sameRefTail = refA && refB && refA.slice(-2) === refB.slice(-2);
          const sameDir = a.direction === b.direction;
          const closeDate = a.transactionDate === b.transactionDate;
          if (sameAmount && sameDir && (sameRefTail || closeDate)) {
          dupes.push({ pair: [a.id, b.id], amount: a.amount, reason: sameRefTail ? 'same_amount_and_reference_tail' :
  'same_amount_and_date', riskLevel: sameRefTail ? 'high' : 'medium' });
          }
      }
    }
    return { ok: true, dryRun: true, duplicateRisksPreview: dupes.length, duplicates: dupes };
  }
  module.exports = { check };
