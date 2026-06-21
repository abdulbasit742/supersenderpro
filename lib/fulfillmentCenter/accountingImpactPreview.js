  'use strict';


  /**
   * Fulfillment Center — accounting impact preview (no ledger write).
   *
   * For an order (revenue recognition on delivery) or a return (refund + COGS
   * reversal). Reuses Receivables Center's ledger-preview style if present.
   */

  const fulfillment = require('./fulfillmentService');
  const returns = require('./returnsService');


  function round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }


  function build(sourceId) {
    // Try order first, then return.
    const order = fulfillment.getRaw(sourceId);
    if (order) {
        const revenue = round2(order.totalPreview || 0);
        const ledgerEntriesPreview = [
         { account: 'Accounts Receivable / Cash', debit: revenue, credit: 0, memo: `Order ${order.orderNumber}` },
         { account: 'Sales Revenue', debit: 0, credit: revenue, memo: `Order ${order.orderNumber}` },
        ];
        return { ok: true, dryRun: true, liveLedgerWrite: false, sourceId: order.id, kind: 'order', ledgerEntriesPreview,
  revenueImpactPreview: revenue, refundImpactPreview: 0, warnings: [], blockers: [] };
    }
    const ret = returns.getRaw(sourceId);
    if (ret) {
        const refund = round2(ret.refundAmountPreview || 0);
        const ledgerEntriesPreview = [


         { account: 'Sales Returns', debit: refund, credit: 0, memo: `Return ${ret.rmaNumber}` },
         { account: 'Accounts Receivable / Cash', debit: 0, credit: refund, memo: `Return ${ret.rmaNumber}` },
       ];
      return { ok: true, dryRun: true, liveLedgerWrite: false, sourceId: ret.id, kind: 'return', ledgerEntriesPreview,
  revenueImpactPreview: round2(-refund), refundImpactPreview: refund, warnings: [], blockers: [] };
      }
      return { ok: false, error: 'source not found' };
  }


  module.exports = { build };
