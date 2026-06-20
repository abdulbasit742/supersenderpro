// lib/staffPortal/redactor.js — Masking + leak detection for the Staff Portal. Never exposes full staff PII.
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
  if (!name) return 'Staff ****';
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

// Mask a reference to "<prefix>_****". prefix derived from the ref's own prefix or a fallback.
function maskRef(ref, fallbackPrefix = 'ref') {
  if (!ref) return `${fallbackPrefix}_****`;
  const str = String(ref);
  const prefix = str.includes('_') ? str.split('_')[0] : (str.match(/^[a-zA-Z]+/) || [fallbackPrefix])[0];
  return `${prefix || fallbackPrefix}_****`;
}

function maskBankRef() { return 'bank_****'; }
function maskPaymentRef() { return 'pay_****'; }
function maskCnic() { return 'cnic_****'; }
function maskSalary() { return 'salary_****'; }

function safeText(value, max = 280) {
  if (value == null) return '';
  return String(value).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
}

function redactStaff(record = {}) {
  return {
    idPreview: maskRef(record.id || 'staff', 'staff'),
    staffNameSafe: maskName(record.name),
    phoneMasked: maskPhone(record.phone),
    emailMasked: maskEmail(record.email),
    addressMasked: maskAddress(record.address),
    cnicMasked: maskCnic(record.cnic),
  };
}

function redactPayroll(record = {}) {
  return {
    payrollIdPreview: maskRef(record.id || 'pay', 'pay'),
    periodPreview: safeText(record.period || ''),
    grossPayPreview: Number(record.gross || 0),
    deductionsPreview: Number(record.deductions || 0),
    netPayPreview: Number(record.net != null ? record.net : (record.gross || 0) - (record.deductions || 0)),
    salaryRefMasked: maskSalary(record.salaryRef),
  };
}

function redactBank() {
  return { bankRefMasked: maskBankRef(), accountMasked: 'acct_****' };
}

function redactPayment(record = {}) {
  return {
    paymentRefPreview: maskPaymentRef(record.paymentRef),
    statusPreview: safeText(record.status || 'preview_only'),
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
  const emails = blob.match(/[A-Za-z0-9._%+*-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || [];
  for (const e of emails) {
    const local = e.split('@')[0];
    if (!local.includes('*')) return true;
  }
  if (/\d{10,}/.test(blob.replace(/\*/g, ''))) return true;
  return false;
}

module.exports = {
  maskPhone, maskEmail, maskName, maskAddress, maskRef, maskBankRef, maskPaymentRef,
  maskCnic, maskSalary, safeText,
  redactStaff, redactPayroll, redactBank, redactPayment, redactDocument, hasLeak,
};
