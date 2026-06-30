'use strict';
/**
 * invoiceEngine.js — Payments & Billing Feature #3: invoices + receipts.
 *
 * Create an invoice (line items, tax, discount -> totals), then when a payment is fulfilled mark it
 * paid so it becomes a receipt. Renders a clean PDF with pdfkit (already a dependency). Designed to be
 * called from fulfillment (#1): on a verified payment, generate + mark-paid + send the receipt.
 *
 * Invoice numbers are sequential and gap-free per year: INV-2026-0001, INV-2026-0002, … (auditors and
 * tax authorities expect this; random ids are a red flag).
 *
 * Storage: JSON (data/invoices.json). PDFs are returned as Buffers so the caller can attach them to
 * WhatsApp/email or write them to disk — this module doesn't assume a transport.
 */

const fs = require('fs');
const path = require('path');

let PDFDocument = null;
try { PDFDocument = require('pdfkit'); } catch { PDFDocument = null; }

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'invoices.json');

let CONFIG = {
  business: { name: 'SuperSender Pro', address: '', taxId: '', email: '', phone: '' },
  currency: 'PKR',
  taxRatePct: 0 // default; override per-invoice or here
};
function configure(opts = {}) { CONFIG = { ...CONFIG, ...opts, business: { ...CONFIG.business, ...(opts.business || {}) } }; return CONFIG; }

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { invoices: [], counters: {} }; }
  catch { return { invoices: [], counters: {} }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

function nextNumber(data) {
  const year = new Date().getFullYear();
  data.counters[year] = (data.counters[year] || 0) + 1;
  const seq = String(data.counters[year]).padStart(4, '0');
  return `INV-${year}-${seq}`;
}

function computeTotals(items, { taxRatePct, discount = 0 } = {}) {
  const subtotal = round2(items.reduce((s, it) => s + (Number(it.qty || 1) * Number(it.unitPrice || 0)), 0));
  const afterDiscount = round2(Math.max(0, subtotal - Number(discount || 0)));
  const rate = taxRatePct != null ? Number(taxRatePct) : Number(CONFIG.taxRatePct || 0);
  const tax = round2(afterDiscount * (rate / 100));
  const total = round2(afterDiscount + tax);
  return { subtotal, discount: round2(discount || 0), taxRatePct: rate, tax, total };
}

/**
 * Create an invoice.
 * @param {Object} opts
 * @param {Object} opts.customer  { name, email?, phone?, address? }
 * @param {Array}  opts.items     [{ description, qty, unitPrice }]
 * @param {number} [opts.discount]
 * @param {number} [opts.taxRatePct]
 * @param {string} [opts.planId] [opts.orderId] [opts.paymentRef]
 */
function createInvoice(opts = {}) {
  const items = Array.isArray(opts.items) ? opts.items : [];
  if (!items.length) throw new Error('invoice needs at least one line item');
  const data = load();
  const totals = computeTotals(items, opts);
  const inv = {
    number: nextNumber(data),
    status: 'unpaid', // unpaid | paid | void
    customer: opts.customer || {},
    items: items.map(it => ({ description: it.description || 'Item', qty: Number(it.qty || 1), unitPrice: round2(it.unitPrice) })),
    currency: opts.currency || CONFIG.currency,
    ...totals,
    planId: opts.planId || null,
    orderId: opts.orderId || null,
    paymentRef: opts.paymentRef || null,
    issuedAt: new Date().toISOString(),
    paidAt: null
  };
  data.invoices.push(inv);
  save(data);
  return inv;
}

function markPaid(number, paymentRef) {
  const data = load();
  const inv = data.invoices.find(i => i.number === number);
  if (!inv) return null;
  inv.status = 'paid';
  inv.paidAt = new Date().toISOString();
  if (paymentRef) inv.paymentRef = paymentRef;
  save(data);
  return inv;
}

function getInvoice(number) { return load().invoices.find(i => i.number === number) || null; }
function listInvoices(filter = {}) {
  let rows = load().invoices;
  if (filter.status) rows = rows.filter(i => i.status === filter.status);
  if (filter.customerPhone) rows = rows.filter(i => i.customer && i.customer.phone === filter.customerPhone);
  return rows;
}

// ---------------------------------------------------------------------------
// PDF rendering (returns a Buffer)
// ---------------------------------------------------------------------------
function renderPdf(number) {
  return new Promise((resolve, reject) => {
    if (!PDFDocument) return reject(new Error('pdfkit not installed'));
    const inv = getInvoice(number);
    if (!inv) return reject(new Error('invoice not found'));

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const b = CONFIG.business || {};
    const title = inv.status === 'paid' ? 'RECEIPT' : 'INVOICE';

    doc.fontSize(20).text(b.name || 'SuperSender Pro', { continued: false });
    if (b.address) doc.fontSize(9).fillColor('#666').text(b.address);
    if (b.taxId) doc.fontSize(9).fillColor('#666').text(`Tax ID: ${b.taxId}`);
    doc.moveDown();

    doc.fillColor('#000').fontSize(16).text(`${title}  ${inv.number}`);
    doc.fontSize(9).fillColor('#666')
      .text(`Issued: ${new Date(inv.issuedAt).toLocaleString()}`)
      .text(inv.status === 'paid' ? `Paid: ${new Date(inv.paidAt).toLocaleString()}` : 'Status: UNPAID');
    doc.moveDown();

    doc.fillColor('#000').fontSize(11).text('Bill To:');
    const c = inv.customer || {};
    doc.fontSize(10).fillColor('#333')
      .text(c.name || '-')
      .text([c.email, c.phone].filter(Boolean).join('  |  '))
      .text(c.address || '');
    doc.moveDown();

    // line items
    doc.fillColor('#000').fontSize(10);
    doc.text('Description', 50, doc.y, { continued: true, width: 280 })
       .text('Qty', 330, doc.y, { continued: true, width: 50 })
       .text('Unit', 380, doc.y, { continued: true, width: 80 })
       .text('Amount', 460, doc.y);
    doc.moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).stroke('#ccc');
    doc.moveDown(0.5);

    for (const it of inv.items) {
      const amount = round2(it.qty * it.unitPrice);
      doc.text(it.description, 50, doc.y, { continued: true, width: 280 })
         .text(String(it.qty), 330, doc.y, { continued: true, width: 50 })
         .text(`${inv.currency} ${it.unitPrice}`, 380, doc.y, { continued: true, width: 80 })
         .text(`${inv.currency} ${amount}`, 460, doc.y);
    }
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#ccc');
    doc.moveDown(0.5);

    const right = (label, val) => doc.fontSize(10).text(`${label}: ${inv.currency} ${val}`, { align: 'right' });
    right('Subtotal', inv.subtotal);
    if (inv.discount) right('Discount', inv.discount);
    if (inv.tax) right(`Tax (${inv.taxRatePct}%)`, inv.tax);
    doc.fontSize(13).fillColor('#000').text(`TOTAL: ${inv.currency} ${inv.total}`, { align: 'right' });

    doc.moveDown(2).fontSize(9).fillColor('#999')
      .text('Thank you for your business.', { align: 'center' });

    doc.end();
  });
}

module.exports = { configure, createInvoice, markPaid, getInvoice, listInvoices, computeTotals, renderPdf };
