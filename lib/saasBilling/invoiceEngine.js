'use strict';
/**
 * invoiceEngine.js — Payments & Billing Feature #3: invoices + receipts.
 *
 * On a successful payment (fulfillment #1), issue a numbered invoice and render a PDF receipt the
 * customer can keep. Invoices are also created for unpaid amounts (e.g. a renewal due) so the
 * billing portal (#5) has something to show.
 *
 * - Sequential, human-friendly invoice numbers (INV-YYYY-#####).
 * - Line items + subtotal + tax + total, currency-aware.
 * - PDF via pdfkit (already in package.json) written to data/receipts/<invoiceNo>.pdf.
 * - JSON record store (data/invoices.json), matching the rest of the app.
 */

const fs = require('fs');
const path = require('path');

let PDFDocument = null;
try { PDFDocument = require('pdfkit'); } catch { PDFDocument = null; }

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'invoices.json');
const RECEIPT_DIR = path.join(__dirname, '..', '..', 'data', 'receipts');

let BUSINESS = {
  name: process.env.BUSINESS_NAME || 'SuperSender Pro',
  address: process.env.BUSINESS_ADDRESS || '',
  taxRate: Number(process.env.INVOICE_TAX_RATE || 0), // e.g. 0.0 .. 0.17
  currency: process.env.INVOICE_CURRENCY || 'PKR',
  footer: process.env.INVOICE_FOOTER || 'Thank you for your business!'
};
function configure(opts = {}) { BUSINESS = { ...BUSINESS, ...opts }; return BUSINESS; }

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { seq: 0, invoices: [] }; }
  catch { return { seq: 0, invoices: [] }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}

function nextInvoiceNo(data) {
  data.seq = (data.seq || 0) + 1;
  const yr = new Date().getFullYear();
  return `INV-${yr}-${String(data.seq).padStart(5, '0')}`;
}

function round2(n) { return Math.round(Number(n || 0) * 100) / 100; }

function computeTotals(lineItems, taxRate) {
  const subtotal = round2(lineItems.reduce((s, li) => s + Number(li.amount || 0) * Number(li.qty || 1), 0));
  const tax = round2(subtotal * Number(taxRate || 0));
  const total = round2(subtotal + tax);
  return { subtotal, tax, total };
}

/**
 * Create an invoice.
 * @param {Object} opts
 * @param {Object} opts.customer  { name?, email?, phone? }
 * @param {Array}  opts.lineItems [{ description, amount, qty? }]
 * @param {string} [opts.status]  'paid' | 'unpaid' (default 'unpaid')
 * @param {string} [opts.currency]
 * @param {number} [opts.taxRate]
 * @param {Object} [opts.meta]    e.g. { planId, orderId, paymentRef }
 */
function createInvoice(opts = {}) {
  const data = load();
  const currency = opts.currency || BUSINESS.currency;
  const taxRate = opts.taxRate != null ? opts.taxRate : BUSINESS.taxRate;
  const lineItems = Array.isArray(opts.lineItems) ? opts.lineItems : [];
  if (!lineItems.length) throw new Error('invoice needs at least one line item');
  const totals = computeTotals(lineItems, taxRate);
  const invoiceNo = nextInvoiceNo(data);
  const invoice = {
    invoiceNo,
    customer: opts.customer || {},
    lineItems,
    currency,
    taxRate,
    ...totals,
    status: opts.status === 'paid' ? 'paid' : 'unpaid',
    meta: opts.meta || {},
    issuedAt: new Date().toISOString(),
    paidAt: opts.status === 'paid' ? new Date().toISOString() : null,
    receiptPath: null
  };
  data.invoices.push(invoice);
  save(data);
  return invoice;
}

function markPaid(invoiceNo, paymentRef) {
  const data = load();
  const inv = data.invoices.find(i => i.invoiceNo === invoiceNo);
  if (!inv) return null;
  inv.status = 'paid';
  inv.paidAt = new Date().toISOString();
  if (paymentRef) inv.meta = { ...inv.meta, paymentRef };
  save(data);
  return inv;
}

function getInvoice(invoiceNo) { return load().invoices.find(i => i.invoiceNo === invoiceNo) || null; }
function listInvoices(filter = {}) {
  let rows = load().invoices.slice();
  if (filter.customer) {
    const q = String(filter.customer).toLowerCase();
    rows = rows.filter(i => JSON.stringify(i.customer).toLowerCase().includes(q));
  }
  if (filter.status) rows = rows.filter(i => i.status === filter.status);
  return rows.reverse();
}

/**
 * Render a PDF receipt for an invoice to data/receipts/<invoiceNo>.pdf. Returns the file path.
 * Resolves once the file is fully written. Safe no-op-with-error if pdfkit is missing.
 */
function renderReceiptPDF(invoiceNo) {
  return new Promise((resolve, reject) => {
    if (!PDFDocument) return reject(new Error('pdfkit not installed'));
    const inv = getInvoice(invoiceNo);
    if (!inv) return reject(new Error('invoice not found'));
    try { fs.mkdirSync(RECEIPT_DIR, { recursive: true }); } catch {}
    const filePath = path.join(RECEIPT_DIR, `${invoiceNo}.pdf`);
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Header
    doc.fontSize(20).text(BUSINESS.name, { align: 'left' });
    if (BUSINESS.address) doc.fontSize(9).fillColor('#666').text(BUSINESS.address);
    doc.moveDown();
    doc.fillColor('#000').fontSize(16).text(inv.status === 'paid' ? 'RECEIPT' : 'INVOICE', { align: 'right' });
    doc.fontSize(10).fillColor('#666')
      .text(`Invoice: ${inv.invoiceNo}`, { align: 'right' })
      .text(`Date: ${new Date(inv.issuedAt).toLocaleDateString()}`, { align: 'right' })
      .text(`Status: ${inv.status.toUpperCase()}`, { align: 'right' });
    doc.moveDown();

    // Bill to
    doc.fillColor('#000').fontSize(11).text('Bill To:');
    doc.fontSize(10).fillColor('#333')
      .text(inv.customer.name || inv.customer.email || inv.customer.phone || 'Customer');
    if (inv.customer.email) doc.text(inv.customer.email);
    if (inv.customer.phone) doc.text(inv.customer.phone);
    doc.moveDown();

    // Line items table
    doc.fillColor('#000').fontSize(11).text('Items:');
    doc.moveDown(0.3);
    inv.lineItems.forEach(li => {
      const qty = Number(li.qty || 1);
      const lineTotal = round2(Number(li.amount || 0) * qty);
      doc.fontSize(10).fillColor('#333')
        .text(`${li.description}  x${qty}`, { continued: true })
        .text(`   ${inv.currency} ${lineTotal.toLocaleString()}`, { align: 'right' });
    });
    doc.moveDown();

    // Totals
    doc.fontSize(10).fillColor('#000')
      .text(`Subtotal: ${inv.currency} ${inv.subtotal.toLocaleString()}`, { align: 'right' });
    if (inv.tax) doc.text(`Tax (${Math.round(inv.taxRate * 100)}%): ${inv.currency} ${inv.tax.toLocaleString()}`, { align: 'right' });
    doc.fontSize(13).text(`Total: ${inv.currency} ${inv.total.toLocaleString()}`, { align: 'right' });
    doc.moveDown(2);
    doc.fontSize(9).fillColor('#888').text(BUSINESS.footer, { align: 'center' });

    doc.end();
    stream.on('finish', () => {
      const data = load();
      const rec = data.invoices.find(i => i.invoiceNo === invoiceNo);
      if (rec) { rec.receiptPath = filePath; save(data); }
      resolve(filePath);
    });
    stream.on('error', reject);
  });
}

/**
 * Convenience used by payment fulfillment (#1): create a PAID invoice from a payment event and
 * render its receipt. Returns { invoice, receiptPath }.
 */
async function issuePaidReceipt({ customer, planName, amount, currency, meta }) {
  const invoice = createInvoice({
    customer,
    lineItems: [{ description: planName || 'Purchase', amount: Number(amount || 0), qty: 1 }],
    status: 'paid',
    currency,
    meta
  });
  let receiptPath = null;
  try { receiptPath = await renderReceiptPDF(invoice.invoiceNo); } catch { /* pdf optional */ }
  return { invoice, receiptPath };
}

module.exports = {
  configure,
  createInvoice,
  markPaid,
  getInvoice,
  listInvoices,
  renderReceiptPDF,
  issuePaidReceipt
};
