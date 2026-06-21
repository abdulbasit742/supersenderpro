  'use strict';


  /** Receivables Center — quotation model vocab + builder. */

  const store = require('./store');
  const { maskPhone, maskEmail, safeName } = require('./redactor');
  const { normalizeItems } = require('./invoiceModel');


  const QUOTATION_STATUSES = ['draft', 'sent_preview', 'accepted_preview', 'rejected_preview', 'expired_preview',
  'converted_preview'];


  function build(input, quoteCount) {
      const i = input || {};
      const now = new Date().toISOString();
      return {
        id: store.genId('quo'),
        quoteNumber: store.nextNumber('QUO', quoteCount),
        customerNameSafe: safeName(i.customerName || i.customerId),
        phoneMasked: i.phone ? maskPhone(i.phone) : null,
        emailMasked: i.email ? maskEmail(i.email) : null,
        items: normalizeItems(i.items),
        subtotalPreview: 0,
        discountPreview: 0,
        taxPreview: 0,
        shippingPreview: 0,
        totalPreview: 0,


     status: 'draft',
     validUntil: i.validUntil || null,
     convertedInvoiceIdPreview: null,
     currency: String(i.currency || 'PKR').slice(0, 8),
     dryRun: true,
     createdAt: now,
     updatedAt: now,
   };
}


module.exports = { QUOTATION_STATUSES, build };
