// lib/franchisePortal/redactor.js — Masking + leak detection for the Franchise/Branch Partner Portal. Never exposes full PII.
'use strict';

function maskPhone(phone) {
  if (!phone) return '';
  const s = String(phone).replace(/[^\d+]/g, '');
  if (s.length <= 4) return '****';
  const head = s.startsWith('+') ? s.slice(0, 3) : s.slice(0, 2);
  const tail = s.slice(-4);
  return `${head}${'*'.repeat(Math.max(4, s.length - head.length - 4))}${tail}`;
}

function maskEmail(email) {
  if (!email || !String(email).includes('@')) return '';
  const [local, domain] = String(email).split('@');
  return `${local.slice(0, 2)}${'*'.repeat(Math.max(3, local.length - 2))}@${domain}`;
}

function maskName(name) {
  if (!name) return 'Franchise ****';
  return String(name).trim().split(/\s+/).map((w) => `${w.charAt(0).toUpperCase()}***`).join(' ');
}

function maskAddress(address) {
  if (!address) return 'address_masked';
  if (typeof address === 'string') return 'address_masked';
  const loc = [address.area || '', address.city || ''].filter(Boolean).join(', ');
  return loc || 'address_masked';
}

function maskRef(ref, fallbackPrefix = 'ref') {
  if (!ref) return `${fallbackPrefix}_****`;
  const str = String(ref);
  const prefix = str.includes('_') ? str.split('_')[0] : (str.match(/^[a-zA-Z]+/) || [fallbackPrefix])[0];
  return `${prefix || fallbackPrefix}_****`;
}

function maskPaymentRef() { return 'pay_****'; }
function maskTaxRef() { return 'tax_****'; }
function maskDocumentRef() { return 'doc_****'; }
function maskBankRef() { return 'bank_****'; }

function safeText(value, max = 280) {
  if (value == null) return '';
  return String(value).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
}

function redactFranchise(record = {}) {
  return {
    idPreview: maskRef(record.id || 'fr', 'fr'),
    franchiseNameSafe: maskName(record.name),
    phoneMasked: maskPhone(record.phone),
    emailMasked: maskEmail(record.email),
    addressMasked: maskAddress(record.address),
    taxRefMasked: maskTaxRef(record.taxRef),
  };
}

function redactPayment(record = {}) {
  return {
    paymentReferenceMasked: maskPaymentRef(record.paymentRef),
    amountPreview: Number(record.amount || 0),
    statusPreview: safeText(record.status || 'pending'),
  };
}

function redactInvoice(record = {}) {
  return {
    invoiceIdPreview: maskRef(record.id || 'finv', 'finv'),
    amountPreview: Number(record.amount || 0),
    paidPreview: Number(record.paid || 0),
    balancePreview: Number(record.balance != null ? record.balance : (record.amount || 0) - (record.paid || 0)),
    paymentStatusPreview: `${safeText(record.status || 'pending')}_preview`,
    paymentReferenceMasked: maskPaymentRef(record.paymentRef),
  };
}

function redactOrder(record = {}) {
  return {
    orderIdPreview: maskRef(record.id || 'rord', 'rord'),
    statusPreview: `${safeText(record.status || 'unknown')}_preview`,
    totalPreview: Number(record.total || 0),
  };
}

function redactDocument(record = {}) {
  return {
    documentIdPreview: maskRef(record.id || 'doc', 'doc'),
    nameSafe: safeText(record.name || 'document'),
    statusPreview: safeText(record.status || 'unknown'),
  };
}

function hasLeak(obj) {
  const blob = typeof obj === 'string' ? obj : JSON.stringify(obj || {});
  const emails = blob.match(/[A-Za-z0-9._%+*-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || [];
  for (const e of emails) { if (!e.split('@')[0].includes('*')) return true; }
  if (/\d{10,}/.test(blob.replace(/\*/g, ''))) return true;
  return false;
}

module.exports = {
  maskPhone, maskEmail, maskName, maskAddress, maskRef,
  maskPaymentRef, maskTaxRef, maskDocumentRef, maskBankRef, safeText,
  redactFranchise, redactPayment, redactInvoice, redactOrder, redactDocument, hasLeak,
};
