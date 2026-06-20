// lib/saasBilling/invoiceStore.js — Persistence for invoice drafts.
// Invoices are never hard-deleted; status moves to cancelled/refunded.
// Payment references are stored masked only.

const { config } = require('./config');
const store = require('./store');

function _load() {
  const d = store.readJSON(config.paths.invoice, null) || {};
  if (!Array.isArray(d.invoices)) d.invoices = [];
  if (typeof d.counter !== 'number') d.counter = 0;
  return d;
}
function _save(d) { return store.writeJSON(config.paths.invoice, d); }

function all() { return _load().invoices; }
function getById(id) { return all().find((i) => i.id === id) || null; }
function forTenant(tenantId) { return all().filter((i) => String(i.tenantId) === String(tenantId)); }

function nextInvoiceNumber() {
  const d = _load();
  d.counter += 1;
  _save(d);
  const yr = new Date().getFullYear();
  return `INV-${yr}-${String(d.counter).padStart(5, '0')}`;
}

function upsert(invoice) {
  const d = _load();
  const idx = d.invoices.findIndex((i) => i.id === invoice.id);
  if (idx >= 0) d.invoices[idx] = invoice; else d.invoices.push(invoice);
  _save(d);
  return invoice;
}

module.exports = { all, getById, forTenant, nextInvoiceNumber, upsert };
