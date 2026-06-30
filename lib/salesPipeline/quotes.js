'use strict';
/**
 * lib/salesPipeline/quotes.js - quote + invoice generation.
 * Quotes and invoices are DOCUMENTS. Marking paid is review-only - this module never
 * captures real payments (see Stripe path in lib/saasBilling for live billing).
 */
const { config } = require('./config');
const { paths } = require('./config');
const store = require('./store');
const { nowISO, id, pad } = require('./util');

const read = (tid) => store.readJSON(paths.quotes(tid), { docs: [] });
const write = (tid, d) => store.writeJSON(paths.quotes(tid), d);

function computeTotals(items, taxPercent) {
  const lines = (items || []).map((i) => {
    const qty = Number(i.qty || 1);
    const unitPrice = Number(i.unitPrice || i.price || 0);
    return { name: i.name || 'Item', qty, unitPrice, lineTotal: Math.round(qty * unitPrice * 100) / 100 };
  });
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const tax = Math.round(subtotal * (Number(taxPercent || 0) / 100) * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;
  return { lines, subtotal, tax, total };
}

function createQuote(tid, input = {}) {
  const data = read(tid);
  const taxPercent = input.taxPercent !== undefined ? Number(input.taxPercent) : config.taxPercent;
  const { lines, subtotal, tax, total } = computeTotals(input.items, taxPercent);
  const seq = store.nextSeq(tid, 'quote');
  const doc = {
    id: id('quo'), type: 'quote', tenantId: tid,
    number: config.quotePrefix + '-' + pad(seq),
    dealId: input.dealId || null,
    contact: { phone: (input.contact && input.contact.phone) || input.phone || '', name: (input.contact && input.contact.name) || input.name || '' },
    items: lines, subtotal, taxPercent, tax, total, currency: input.currency || config.currency,
    notes: input.notes || '', status: 'draft',
    validUntil: input.validUntil || new Date(Date.now() + 14 * 86400000).toISOString(),
    createdAt: nowISO(), updatedAt: nowISO(),
  };
  data.docs.unshift(doc);
  write(tid, data);
  if (global.wsEvent) global.wsEvent('sales.quote_created', { tenantId: tid, number: doc.number });
  return doc;
}

function createInvoice(tid, input = {}) {
  const data = read(tid);
  let base = input;
  if (input.quoteId) {
    const q = data.docs.find((d) => d.id === input.quoteId || d.number === input.quoteId);
    if (!q) throw new Error('quote not found');
    base = { items: q.items, contact: q.contact, dealId: q.dealId, currency: q.currency, taxPercent: q.taxPercent, notes: q.notes };
    q.status = 'accepted'; q.updatedAt = nowISO();
  }
  const taxPercent = base.taxPercent !== undefined ? Number(base.taxPercent) : config.taxPercent;
  const { lines, subtotal, tax, total } = computeTotals(base.items, taxPercent);
  const seq = store.nextSeq(tid, 'invoice');
  const doc = {
    id: id('inv'), type: 'invoice', tenantId: tid,
    number: config.invoicePrefix + '-' + pad(seq),
    dealId: base.dealId || null,
    contact: base.contact || {},
    items: lines, subtotal, taxPercent, tax, total, currency: base.currency || config.currency,
    notes: base.notes || '', status: 'issued',
    dueDate: new Date(Date.now() + config.invoiceDueDays * 86400000).toISOString(),
    createdAt: nowISO(), updatedAt: nowISO(),
  };
  data.docs.unshift(doc);
  write(tid, data);
  if (global.wsEvent) global.wsEvent('sales.invoice_created', { tenantId: tid, number: doc.number, total });
  return doc;
}

function setStatus(tid, docId, status, extra = {}) {
  const data = read(tid);
  const doc = data.docs.find((d) => d.id === docId || d.number === docId);
  if (!doc) return null;
  doc.status = status;
  doc.updatedAt = nowISO();
  Object.assign(doc, extra);
  write(tid, data);
  return doc;
}

function getById(tid, docId) {
  return read(tid).docs.find((d) => d.id === docId || d.number === docId) || null;
}

function list(tid, filter = {}) {
  let docs = read(tid).docs;
  if (filter.type) docs = docs.filter((d) => d.type === filter.type);
  if (filter.dealId) docs = docs.filter((d) => d.dealId === filter.dealId);
  if (filter.status) docs = docs.filter((d) => d.status === filter.status);
  return docs;
}

function renderText(doc) {
  if (!doc) return '';
  const cur = doc.currency;
  const head = doc.type === 'invoice' ? 'INVOICE' : 'QUOTATION';
  const rows = doc.items.map((l) => '  ' + l.qty + ' x ' + l.name + ' @ ' + cur + ' ' + l.unitPrice + '  =  ' + cur + ' ' + l.lineTotal).join('\n');
  return [
    head + '  ' + doc.number,
    'To: ' + (doc.contact.name || doc.contact.phone || '-'),
    'Date: ' + new Date(doc.createdAt).toDateString(),
    doc.type === 'invoice' ? 'Due: ' + new Date(doc.dueDate).toDateString() : 'Valid until: ' + new Date(doc.validUntil).toDateString(),
    '', rows, '',
    'Subtotal: ' + cur + ' ' + doc.subtotal,
    'Tax (' + doc.taxPercent + '%): ' + cur + ' ' + doc.tax,
    'TOTAL: ' + cur + ' ' + doc.total,
    doc.notes ? '\nNote: ' + doc.notes : '',
  ].join('\n');
}

function renderHTML(doc) {
  if (!doc) return '';
  const cur = doc.currency;
  const head = doc.type === 'invoice' ? 'Invoice' : 'Quotation';
  const rows = doc.items.map((l) => '<tr><td>' + l.name + '</td><td style="text-align:right">' + l.qty + '</td><td style="text-align:right">' + cur + ' ' + l.unitPrice + '</td><td style="text-align:right">' + cur + ' ' + l.lineTotal + '</td></tr>').join('');
  return '<!doctype html><html><head><meta charset="utf-8"><title>' + head + ' ' + doc.number + '</title>'
    + '<style>body{font-family:system-ui,Arial,sans-serif;max-width:680px;margin:24px auto;color:#111}'
    + 'table{width:100%;border-collapse:collapse;margin:16px 0}th,td{padding:8px;border-bottom:1px solid #eee}'
    + '.tot{text-align:right;font-weight:600}h1{font-size:20px}</style></head><body>'
    + '<h1>' + head + ' ' + doc.number + '</h1>'
    + '<p>To: <b>' + (doc.contact.name || doc.contact.phone || '-') + '</b><br>Date: ' + new Date(doc.createdAt).toDateString() + '</p>'
    + '<table><thead><tr><th>Item</th><th style="text-align:right">Qty</th><th style="text-align:right">Unit</th><th style="text-align:right">Total</th></tr></thead><tbody>' + rows + '</tbody></table>'
    + '<p class="tot">Subtotal: ' + cur + ' ' + doc.subtotal + '<br>Tax (' + doc.taxPercent + '%): ' + cur + ' ' + doc.tax + '<br>Total: ' + cur + ' ' + doc.total + '</p>'
    + (doc.notes ? '<p>' + doc.notes + '</p>' : '')
    + '</body></html>';
}

module.exports = { createQuote, createInvoice, setStatus, getById, list, renderText, renderHTML, computeTotals };
