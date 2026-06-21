  'use strict';


  /** Receivables Center — invoice model vocab + builder. */

  const store = require('./store');
  const { maskPhone, maskEmail, safeName } = require('./redactor');

  const INVOICE_STATUSES = ['draft', 'sent_preview', 'viewed_preview', 'partially_paid_preview', 'paid_preview',
  'overdue_preview', 'cancelled_preview', 'bad_debt_preview'];

  function normalizeItems(items) {
    return (Array.isArray(items) ? items : []).slice(0, 100).map((it) => ({
         name: String((it && it.name) || 'Item').slice(0, 120),
         qty: Math.max(0, Number(it && it.qty) || 1),
         unitPrice: Math.max(0, Number(it && it.unitPrice) || 0),
         cost: Math.max(0, Number(it && it.cost) || 0), // for margin preview only
       }));
  }


  function build(input, invoiceCount) {
       const i = input || {};
       const now = new Date().toISOString();


      return {
        id: store.genId('inv'),
        invoiceNumber: store.nextNumber('INV', invoiceCount),
        customerNameSafe: safeName(i.customerName || i.customerId),
        phoneMasked: i.phone ? maskPhone(i.phone) : null,
        emailMasked: i.email ? maskEmail(i.email) : null,
        sourceModule: String(i.sourceModule || 'manual').slice(0, 40),
        items: normalizeItems(i.items),
        subtotalPreview: 0,
        discountPreview: 0,
        taxPreview: 0,
        shippingPreview: 0,
        totalPreview: 0,
        paidAmountPreview: Math.max(0, Number(i.paidAmount) || 0),
        balanceDuePreview: 0,
        status: 'draft',
        dueDate: i.dueDate || null,
        currency: String(i.currency || 'PKR').slice(0, 8),
        dryRun: true,
        createdAt: now,
        updatedAt: now,
      };
  }

  module.exports = { INVOICE_STATUSES, build, normalizeItems };
