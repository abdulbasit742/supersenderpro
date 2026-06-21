// lib/serviceCenter/accountingImpactPreview.js
// Previews invoice + ledger entries a completed service WOULD generate. Never posts.
// Reuses Receivables / Accounting Center read-only when present.
'use strict';

const store = require('./store');
const profitability = require('./serviceProfitability');
const { maskRef } = require('./redactor');

function tryRequire(paths) {
  for (const p of paths) { try { return require(p); } catch (e) { /* degrade */ } }
    return null;
}
const receivables = tryRequire(['../receivablesCenter/invoiceService', '../invoiceCenter', '../receivablesCenter']);
const accounting = tryRequire(['../accountingCenter/ledgerService', '../accountingCenter']);

const FLAGS = { liveInvoice: false, liveLedgerWrite: false };

function forWorkOrder(woId) {
    const wo = store.getWorkOrder(woId);
    if (!wo) return { ok: false, errors: ['work order not found'] };
    const prof = profitability.forWorkOrder(wo.id);
    if (!prof.ok) return prof;
    const invoiceDraft = {
      ref: 'INV-PREVIEW-' + wo.ref,
     customerRef: wo.customerId,
     lineItems: [
       { desc: 'Service labor', amount: prof.laborCost },
       { desc: 'Parts', amount: prof.partsCost }
     ],
     subtotal: prof.totalCost,
     quotedTotal: prof.quotedPrice,
     paymentRef: maskRef(store.paymentRefs[wo.id])
    };
    const ledgerPreview = [
     { account: 'Accounts Receivable', debit: prof.quotedPrice, credit: 0 },
     { account: 'Service Revenue', debit: 0, credit: prof.quotedPrice },
     { account: 'COGS - Parts', debit: prof.partsCost, credit: 0 },
     { account: 'Inventory', debit: 0, credit: prof.partsCost }
    ];
    return {
     ok: true,
     ref: wo.ref,
     receivablesConnected: !!receivables,
     accountingConnected: !!accounting,
     liveInvoice: FLAGS.liveInvoice,
     liveLedgerWrite: FLAGS.liveLedgerWrite,
     invoiceDraft,
     ledgerPreview,


     note: 'Preview only. No invoice issued, no ledger entry posted. Both live flags disabled.'
   };
}


module.exports = { FLAGS, forWorkOrder };
