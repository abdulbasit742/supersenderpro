  'use strict';


  /**
   * Receivables Center — accounting ledger link + revenue recognition PREVIEW.
      *
      * Produces double-entry ledger lines + a simple revenue recognition preview for
      * an invoice. Never writes to any ledger; reuses an Accounting Center adapter
      * read-only if present, else returns a standalone preview.
      */


  const invoiceService = require('./invoiceService');


  function accountingModule() {
    try { return require('../accountingCenter'); } catch (_e) {}
          try { return require('../accounting/store'); } catch (_e) {}
          return null;
  }


  function build(invoiceId) {
    const inv = invoiceService.getRaw(invoiceId);


   if (!inv) return { ok: false, error: 'invoice not found' };


   const total = inv.totalPreview || 0;
   const tax = inv.taxPreview || 0;
   const revenue = Math.round((total - tax) * 100) / 100;


   // Standard accrual double-entry preview at invoice issuance.
   const ledgerEntriesPreview = [
     { account: 'Accounts Receivable', debit: total, credit: 0, memo: `Invoice ${inv.invoiceNumber}` },
     { account: 'Sales Revenue', debit: 0, credit: revenue, memo: `Invoice ${inv.invoiceNumber}` },
   ];
 if (tax > 0) ledgerEntriesPreview.push({ account: 'Tax Payable', debit: 0, credit: tax, memo: `Tax on
${inv.invoiceNumber}` });

   const revenueRecognitionPreview = {
     method: 'point_in_time_preview',
     recognizedNow: revenue,
     deferred: 0,
     note: 'goods/one-off service recognized at invoice; adjust for subscriptions',
   };

   return {
     ok: true,
     dryRun: true,
     liveLedgerWrite: false,
     invoiceId: inv.id,
     accountingModuleDetected: Boolean(accountingModule()),
     ledgerEntriesPreview,
     revenueRecognitionPreview,
     warnings: accountingModule() ? [] : ['no accounting center detected; preview is standalone'],
     blockers: [],
   };
}


module.exports = { build };
