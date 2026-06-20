// lib/customerPortal/redactor.js — Masking + leak detection for the customer-facing portal. Never exposes full PII.
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
  const visible = local.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(3, local.length - 2))}@${domain}`;
}

function maskName(name) {
  if (!name) return 'Customer ****';
  return String(name).trim().split(/\s+/).map((w) => `${w.charAt(0).toUpperCase()}***`).join(' ');
}

function maskAddress(address) {
  if (!address) return 'address_masked';
  if (typeof address === 'string') return 'address_masked';
  const area = address.area || '';
  const city = address.city || '';
  const loc = [area, city].filter(Boolean).join(', ');
  return loc || 'address_masked';
}

// Mask a reference to "<prefix>_****". prefix is derived from the ref's own prefix or a fallback.
function maskRef(ref, fallbackPrefix = 'ref') {
  if (!ref) return `${fallbackPrefix}_****`;
  const str = String(ref);
  const prefix = str.includes('_') ? str.split('_')[0] : (str.match(/^[a-zA-Z]+/) || [fallbackPrefix])[0];
  return `${prefix || fallbackPrefix}_****`;
}

function safeText(value, max = 280) {
  if (value == null) return '';
  return String(value).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
}

function redactCustomer(record = {}) {
  return {
    idPreview: maskRef(record.id || 'cus', 'cus'),
    customerNameSafe: maskName(record.name),
    phoneMasked: maskPhone(record.phone),
    emailMasked: maskEmail(record.email),
    addressMasked: maskAddress(record.address),
  };
}

function redactPayment(record = {}) {
  return {
    paymentRefPreview: maskRef(record.paymentRef || record.ref || 'pay', 'pay'),
    amountPreview: Number(record.amount || 0),
    paidPreview: Number(record.paid || 0),
    balancePreview: Number(record.balance != null ? record.balance : (record.amount || 0) - (record.paid || 0)),
  };
}

function redactDocument(record = {}) {
  return {
    documentIdPreview: maskRef(record.id || 'doc', 'doc'),
    nameSafe: safeText(record.name || 'document'),
    statusPreview: safeText(record.status || 'unknown'),
  };
}

// Leak detector for tests: catches raw (unmasked) emails and raw phone numbers.
function hasLeak(obj) {
  const blob = typeof obj === 'string' ? obj : JSON.stringify(obj || {});
  // Raw email: any email whose local part contains no mask star.
  const emails = blob.match(/[A-Za-z0-9._%+*-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || [];
  for (const e of emails) {
    const local = e.split('@')[0];
    if (!local.includes('*')) return true;
  }
  // Raw phone: 10+ consecutive digits once mask stars are removed.
  if (/\d{10,}/.test(blob.replace(/\*/g, ''))) return true;
  return false;
}

module.exports = {
  maskPhone, maskEmail, maskName, maskAddress, maskRef, safeText,
  redactCustomer, redactPayment, redactDocument, hasLeak,
};
