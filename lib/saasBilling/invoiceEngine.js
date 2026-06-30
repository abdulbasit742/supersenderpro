'use strict';
/**
 * invoiceEngine.js — Payments & Billing Feature #3: invoices + receipts.
 *
 * Generate a proper invoice (line items, tax, totals, sequential number) and, once paid, a receipt
 * the customer can keep. Designed to be called right after fulfillment (#1): a verified payment
 * produces a paid invoice = receipt automatically.
 *
 * PDF rendering uses pdfkit (already a project dependency, used elsewhere for PDFs). renderPdf()
 * returns a Buffer so the caller can stream it over HTTP, attach to WhatsApp, or save to disk.
 *
 * Storage: JSON (data/invoices.json), matching the rest of the app.
 */

const fs = require('fs');
const path = require('path');

let PDFDocument = null;
try { PDFDocument = require('pdfkit'); } catch { PDFDocument = null; }

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'invoices.json');

let CONFIG = {
  business: { name: 'SuperSender Pro', address: '', email: '', phone: '' },
  currency: 'PKR',
  taxPercent: 0 // set e.g. 16 for GST; applied to subtotal
};
function configure(opts = {}) {
  CONFIG = { ...CONFIG, ...opts, business: { ...CONFIG.business, ...(opts.business || {}) } };
  return CONFIG;
}

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { invoices: [], seq: {} }; }
  catch { return { invoices: [], seq: {} }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}

const nowIso = () => new Date().toISOString();
function round2(n) { return Math.round(Number(n || 0) * 100) / 100; }

// Sequential, human-friendly invoice number per year: INV-2026-0001
function nextNumber(data) {
  const year = new Date().getFullYear();
  data.seq[year] = (data.seq[year] || 0) + 1;
  return `INV-${year}-${String(data.seq[year]).padStart(4, '0')}`;
}

function computeTotals(items, taxPercent) {
  const subtotal = round2(items.reduce((s, it) => s + Number(it.quantity || 1) * Number(it.unitPrice || 0), 0));
  const tax = round2(subtotal * (Number(taxPercent || 0) / 100));
  const total = round2(subtotal + tax);
  return { subtotal, tax, total };
}

/**
 * Create an invoice.
 * @param {Object} opts
 * @param {Object} opts.customer  { name?, email?, phone? }
 * @param {Array}  opts.items     [{ description, quantity, unitPrice }]
 * @param {string} [opts.currency]
 * @param {number} [opts.taxPercent]
 * @param {string} [opts.status]  'draft' | 'unpaid' (default 'unpaid')
 * @param {Object} [opts.meta]    e.g. { orderId, planId, paymentRef }
 */
function createInvoice(opts = {}) {
  const items = Array.isArray(opts.items) ? opts.items : [];
  if (!items.length) throw new Error('invoice needs at least one line item');
  const data = load();
  const currency = opts.currency || CONFIG.currency;
  const taxPercent = opts.taxPercent != null ? opts.taxPercent : CONFIG.taxPercent;
  const totals = computeTotals(items, taxPercent);
  const inv = {
    id: `INVID-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    number: nextNumber(data),
    status: opts.status === 'draft' ? 'draft' : 'unpaid', // draft | unpaid | paid | void
    customer: opts.customer || {},
    items: items.map(it => ({
      description: it.description || 'Item',
      quantity: Number(it.quantity || 1),
      unitPrice: Number(it.unitPrice || 0),
      amount: round2(Number(it.quantity || 1) * Number(it.unitPrice || 0))
    })),
    currency,
    taxPercent,
    ...totals,
    meta: opts.meta || {},
    issuedAt: nowIso(),
    paidAt: null,
    updatedAt: nowIso()
  };
  data.invoices.push(inv);
  save(data);
  return inv;
}

function markPaid(invoiceId, paymentRef) {
  const data = load();
  const inv = data.invoices.find(i => i.id === invoiceId || i.number === invoiceId);
  if (!inv) return null;
  inv.status = 'paid';
  inv.paidAt = nowIso();
  if (paymentRef) inv.meta.paymentRef = paymentRef;
  inv.updatedAt = nowIso();
  save(data);
  return inv;
}

function voidInvoice(invoiceId) {
  const data = load();
  const inv = data.invoices.find(i => i.id === invoiceId || i.number === invoiceId);
  if (!inv) return null;
  inv.status = 'void';
  inv.updatedAt = nowIso();
  save(data);
  return inv;
}

function getInvoice(invoiceId) {
  return load().invoices.find(i => i.id === invoiceId || i.number === invoiceId) || null;
}
function listInvoices(filter = {}) {
  let rows = load().invoices;
  if (filter.status) rows = rows.filter(i => i.status === filter.status);
  if (filter.customer) {
    const q = String(filter.customer).toLowerCase();
    rows = rows.filter(i => JSON.stringify(i.customer).toLowerCase().includes(q));
  }
  return rows;
}

/**
 * Convenience for fulfillment (#1): build + immediately mark a paid invoice (a receipt).
 */
function createPaidReceipt({ customer, items, currency, taxPercent, meta, paymentRef }) {
  const inv = createInvoice({ customer, items, currency, taxPercent, meta, status: 'unpaid' });
  return markPaid(inv.id, paymentRef);
}

// ---------------------------------------------------------------------------
// PDF rendering
// ---------------------------------------------------------------------------
/**
 * Render an invoice/receipt to a PDF Buffer. Resolves once the document is fully written.
 */
function renderPdf(invoiceId) {
  return new Promise((resolve, reject) => {
    if (!PDFDocument) return reject(new Error('pdfkit not installed'));
    const inv = getInvoice(invoiceId);
    if (!inv) return reject(new Error('invoice not found'));

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const b = CONFIG.business;
    const isReceipt = inv.status === 'paid';
    const money = (n) => `${inv.currency} ${Number(n).toLocaleString()}`;

    // Header
    doc.fontSize(20).text(b.name || 'Invoice', { align: 'left' });
    if (b.address) doc.fontSize(9).fillColor('#666').text(b.address);
    if (b.email) doc.fontSize(9).fillColor('#666').text(b.email);
    if (b.phone) doc.fontSize(9).fillColor('#666').text(b.phone);
    doc.moveDown();

    doc.fillColor('#000').fontSize(16).text(isReceipt ? 'RECEIPT' : 'INVOICE', { align: 'right' });
    doc.fontSize(10).fillColor('#444')
      .text(`No: ${inv.number}`, { align: 'right' })
      .text(`Date: ${new Date(inv.issuedAt).toLocaleDateString()}`, { align: 'right' })
      .text(`Status: ${inv.status.toUpperCase()}`, { align: 'right' });
    doc.moveDown();

    // Bill to
    doc.fillColor('#000').fontSize(11).text('Bill To:');
    doc.fontSize(10).fillColor('#444')
      .text(inv.customer.name || inv.customer.email || inv.customer.phone || 'Customer');
    if (inv.customer.email) doc.text(inv.customer.email);
    if (inv.customer.phone) doc.text(inv.customer.phone);
    doc.moveDown();

    // Items table (simple)
    doc.fillColor('#000').fontSize(11).text('Items');
    doc.moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).strokeColor('#ccc').stroke();
    doc.moveDown(0.5);
    inv.items.forEach(it => {
      doc.fontSize(10).fillColor('#000')
        .text(`${it.description}  x${it.quantity}`, 50, doc.y, { continued: true })
        .text(money(it.amount), { align: 'right' });
    });
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#ccc').stroke();
    doc.moveDown(0.5);

    // Totals
    doc.fontSize(10).text(`Subtotal`, { continued: true }).text(money(inv.subtotal), { align: 'right' });
    if (inv.tax) doc.text(`Tax (${inv.taxPercent}%)`, { continued: true }).text(money(inv.tax), { align: 'right' });
    doc.fontSize(12).fillColor('#000').text(`Total`, { continued: true }).text(money(inv.total), { align: 'right' });

    if (isReceipt) {
      doc.moveDown();
      doc.fontSize(11).fillColor('#0a7').text(`PAID${inv.paidAt ? ' on ' + new Date(inv.paidAt).toLocaleDateString() : ''}`, { align: 'right' });
    }

    doc.end();
  });
}

module.exports = {
  configure,
  createInvoice,
  createPaidReceipt,
  markPaid,
  voidInvoice,
  getInvoice,
  listInvoices,
  renderPdf
};
