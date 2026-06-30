// AI Invoice / Receipt Generator
// House rules: deterministic core (works with NO model), Ollama only phrases
// an optional thank-you note (graceful fallback), zero new npm deps, file-backed
// per-tenant storage, tenant-scoped (missing tenantId throws), server.js untouched.

'use strict';

const fs = require('fs');
const path = require('path');

let aiBrain = null;
try { aiBrain = require('../../ai/aiBrain'); } catch (_) { aiBrain = null; }

const ROOT = path.join(process.cwd(), 'data', 'invoiceGenerator');

function ensureDir(dir) {
  try { fs.mkdirSync(dir, { recursive: true }); } catch (_) {}
}

function tenantDir(tenantId) {
  if (!tenantId) throw new Error('tenantId is required');
  const dir = path.join(ROOT, String(tenantId));
  ensureDir(dir);
  return dir;
}

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

// Deterministic invoice numbering: INV-<YYYY>-<seq padded 5>
function nextInvoiceNumber(tenantId) {
  const dir = tenantDir(tenantId);
  const counterFile = path.join(dir, '_counter.json');
  let seq = 0;
  let year = new Date().getFullYear();
  try {
    const raw = JSON.parse(fs.readFileSync(counterFile, 'utf8'));
    if (raw && raw.year === year) seq = Number(raw.seq) || 0;
  } catch (_) {}
  seq += 1;
  try { fs.writeFileSync(counterFile, JSON.stringify({ year: year, seq: seq })); } catch (_) {}
  const padded = String(seq).padStart(5, '0');
  return 'INV-' + year + '-' + padded;
}

// Build deterministic invoice from an order payload.
// order = { items:[{name, qty, price}], taxRate, discount, currency, customer, notes }
function buildInvoice(tenantId, order) {
  if (!tenantId) throw new Error('tenantId is required');
  order = order || {};
  const items = Array.isArray(order.items) ? order.items : [];
  const currency = order.currency || 'PKR';
  const taxRate = Number(order.taxRate) || 0; // percent
  const discount = Number(order.discount) || 0; // absolute amount

  const lines = items.map(function (it) {
    const qty = Number(it.qty) || 0;
    const price = Number(it.price) || 0;
    const lineTotal = round2(qty * price);
    return {
      name: it.name || 'Item',
      qty: qty,
      price: round2(price),
      lineTotal: lineTotal
    };
  });

  const subtotal = round2(lines.reduce(function (s, l) { return s + l.lineTotal; }, 0));
  const taxAmount = round2(subtotal * (taxRate / 100));
  const afterDiscount = round2(subtotal - discount);
  const grandTotal = round2(afterDiscount + taxAmount);

  return {
    invoiceNumber: nextInvoiceNumber(tenantId),
    issuedAt: new Date().toISOString(),
    currency: currency,
    customer: order.customer || null,
    lines: lines,
    subtotal: subtotal,
    discount: round2(discount),
    taxRate: taxRate,
    taxAmount: taxAmount,
    grandTotal: grandTotal,
    notes: order.notes || null,
    thankYou: null
  };
}

// Optional: enrich with an Ollama-phrased thank-you. Falls back to a template
// when the model is offline. Never blocks invoice creation.
async function phraseThankYou(invoice) {
  const fallback = 'Thank you for your order! Your invoice ' + invoice.invoiceNumber +
    ' totals ' + invoice.currency + ' ' + invoice.grandTotal + '. We appreciate your business.';
  if (!aiBrain || typeof aiBrain.processPrompt !== 'function') return fallback;
  try {
    const prompt = 'Write a one-sentence warm thank-you for invoice ' + invoice.invoiceNumber +
      ' total ' + invoice.currency + ' ' + invoice.grandTotal + '. No emojis, under 30 words.';
    const out = await aiBrain.processPrompt(prompt, { maxTokens: 60 });
    const text = (out && (out.text || out.content || out.message)) || (typeof out === 'string' ? out : '');
    const clean = String(text || '').trim();
    return clean.length ? clean : fallback;
  } catch (_) {
    return fallback;
  }
}

async function createInvoice(tenantId, order, opts) {
  opts = opts || {};
  const invoice = buildInvoice(tenantId, order);
  if (opts.thankYou !== false) {
    invoice.thankYou = await phraseThankYou(invoice);
  }
  const dir = tenantDir(tenantId);
  const file = path.join(dir, invoice.invoiceNumber + '.json');
  try { fs.writeFileSync(file, JSON.stringify(invoice, null, 2)); } catch (_) {}
  return invoice;
}

function getInvoice(tenantId, invoiceNumber) {
  const dir = tenantDir(tenantId);
  const file = path.join(dir, String(invoiceNumber) + '.json');
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return null; }
}

function listInvoices(tenantId) {
  const dir = tenantDir(tenantId);
  let files = [];
  try { files = fs.readdirSync(dir); } catch (_) { return []; }
  return files
    .filter(function (f) { return f.indexOf('INV-') === 0 && f.endsWith('.json'); })
    .map(function (f) { return f.replace(/\.json$/, ''); })
    .sort();
}

// Plain-text receipt render (deterministic, no model)
function renderText(invoice) {
  const out = [];
  out.push('INVOICE ' + invoice.invoiceNumber);
  out.push('Date: ' + invoice.issuedAt);
  if (invoice.customer) out.push('Customer: ' + invoice.customer);
  out.push('');
  invoice.lines.forEach(function (l) {
    out.push(l.qty + ' x ' + l.name + ' @ ' + l.price + ' = ' + l.lineTotal);
  });
  out.push('');
  out.push('Subtotal: ' + invoice.currency + ' ' + invoice.subtotal);
  if (invoice.discount) out.push('Discount: -' + invoice.currency + ' ' + invoice.discount);
  if (invoice.taxRate) out.push('Tax (' + invoice.taxRate + '%): ' + invoice.currency + ' ' + invoice.taxAmount);
  out.push('TOTAL: ' + invoice.currency + ' ' + invoice.grandTotal);
  if (invoice.thankYou) { out.push(''); out.push(invoice.thankYou); }
  return out.join('\n');
}

module.exports = {
  buildInvoice: buildInvoice,
  createInvoice: createInvoice,
  getInvoice: getInvoice,
  listInvoices: listInvoices,
  nextInvoiceNumber: nextInvoiceNumber,
  renderText: renderText,
  round2: round2
};
