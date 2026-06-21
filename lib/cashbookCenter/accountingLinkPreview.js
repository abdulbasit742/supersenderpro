  'use strict';
  /**
      * accountingLinkPreview.js — builds preview double-entry ledger entries for a
      * cash transaction. Bridges to Accounting Center read-only if present, else
      * returns a standalone preview. NEVER writes to the ledger.
      */
  function accountsFor(txn) {
    const cashAccount = txn.method === 'cash' ? 'Cash' : 'Bank/Wallet';
       if (txn.direction === 'cash_in') {
         return [
            { account: cashAccount, debit: txn.amount, credit: 0 },
            { account: txn.linkedInvoiceIdPreview ? 'Accounts Receivable' : 'Revenue/Unallocated', debit: 0, credit: txn.amount
  },
         ];
       }
       return [
         { account: txn.linkedBillIdPreview ? 'Accounts Payable' : 'Expense/Unallocated', debit: txn.amount, credit: 0 },
         { account: cashAccount, debit: 0, credit: txn.amount },
       ];
  }


  function preview(txn) {
       let target = 'standalone_preview';
       try { const ac = require('../accountingCenter'); if (ac) target = 'accounting_center_detected'; } catch (e) {}
       return {
         ok: true, dryRun: true, liveLedgerWrite: false, transactionId: txn.id,
         target,
         ledgerEntriesPreview: accountsFor(txn),
         warnings: target === 'standalone_preview' ? ['accounting_center_not_detected_preview_only'] : [],
         blockers: [],
       };
  }
  module.exports = { preview, accountsFor };
