  'use strict';


  /** Receivables Center — quotation service (preview only) + convert-to-invoice preview. */


  const store = require('./store');
  const model = require('./quotationModel');
  const calc = require('./taxDiscountCalculator');
  const invoiceService = require('./invoiceService');
  const { redactDeep } = require('./redactor');


  function applyTotals(q, calcInput) {
      const c = calc.calculate({ items: q.items, ...(calcInput || {}) });
      q.subtotalPreview = c.subtotalPreview; q.discountPreview = c.discountPreview; q.taxPreview = c.taxPreview;
  q.shippingPreview = c.shippingPreview; q.totalPreview = c.totalPreview;
    return q;
  }


  function create(input) {
    const quotes = store.readQuotations();
      const q = model.build(input, quotes.length);
      applyTotals(q, input);
      quotes.unshift(q);
      if (quotes.length > 3000) quotes.length = 3000;
      store.writeQuotations(quotes);
      return redactDeep(q);
  }


  function list(filter) {
    let items = store.readQuotations();
      const f = filter || {};
      if (f.status) items = items.filter((x) => x.status === f.status);
    if (f.q) { const qq = String(f.q).toLowerCase(); items = items.filter((x) => (x.customerNameSafe ||
  '').toLowerCase().includes(qq) || (x.quoteNumber || '').toLowerCase().includes(qq)); }
      return items.slice(0, Number.isFinite(f.limit) ? f.limit : 100).map(redactDeep);
  }
  function getRaw(id) { return store.readQuotations().find((x) => x.id === id || x.quoteNumber === id) || null; }
  function get(id) { const x = getRaw(id); return x ? redactDeep(x) : null; }


  function update(id, patch) {
      const items = store.readQuotations();
      const idx = items.findIndex((x) => x.id === id || x.quoteNumber === id);
      if (idx === -1) return null;
      const q = items[idx]; const b = patch || {};
      if (Array.isArray(b.items)) q.items = require('./invoiceModel').normalizeItems(b.items);
      if (b.validUntil !== undefined) q.validUntil = b.validUntil;
      if (model.QUOTATION_STATUSES.includes(b.status)) q.status = b.status;
      applyTotals(q, b);
      q.dryRun = true; q.updatedAt = new Date().toISOString();
      items[idx] = q; store.writeQuotations(items);


   return redactDeep(q);
}


/** Convert preview: builds an invoice from the quote without finalizing. */
function convertPreview(id) {
   const items = store.readQuotations();
   const idx = items.findIndex((x) => x.id === id || x.quoteNumber === id);
   if (idx === -1) return null;
   const q = items[idx];
   // create a draft invoice from the quote's items
   const inv = invoiceService.create({ customerName: q.customerNameSafe, items: q.items, sourceModule: 'quotation',
currency: q.currency });
 q.convertedInvoiceIdPreview = inv.id;
   q.status = 'converted_preview';
   q.updatedAt = new Date().toISOString();
   items[idx] = q; store.writeQuotations(items);
   return { ok: true, dryRun: true, quoteId: q.id, convertedInvoiceIdPreview: inv.id, invoicePreview: inv, warnings: [],
blockers: [] };
}

module.exports = { create, list, get, getRaw, update, convertPreview };
