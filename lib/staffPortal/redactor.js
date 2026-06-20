// lib/staffPortal/redactor.js — Masking + leak detection for the Staff Portal. Never exposes full staff PII.
'use strict';

function maskPhone(phone) {
  if (!phone) return '';
  const s = String(phone).replace(/[^\d+]/g, '');
  if (s.length <= 4) return '****';
  const head = s.startsWith('+') ? s.slice(0, 3) : s.slice(0, 2);
  return `${head}${'*'.repeat(Math.max(4, s.length - head.length - 4))}${s.slice(-4)}`;
}

function maskEmail(email) {
  if (!email || !String(email).includes('@')) return '';
  const [local, domain] = String(email).split('@');
  return `${local.slice(0, 2)}${'*'.repeat(Math.max(3, local.length - 2))}@${domain}`;
}

function maskName(name) {
  if (!name) return 'Staff ****';
  return String(name).trim().split(/\s+/).map((w) => `${w.charAt(0).toUpperCase()}***`).join(' ');
}

function maskAddress(address) {
  if (!address) return 'address_masked';
  if (typeof address === 'string') return 'address_masked';
  const loc = [address.area, address.city].filter(Boolean).join(', ');
  return loc || 'address_masked';
}

function maskRef(ref, fallbackPrefix = 'ref') {
  if (!ref) return `${fallbackPrefix}_****`;
  const str = String(ref);
  const prefix = str.includes('_') ? str.split('_')[0] : (str.match(/^[a-zA-Z]+/) || [fallbackPrefix])[0];
  return `${prefix || fallbackPrefix}_****`;
}

// Fixed safe placeholders for the most sensitive references.
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
    idPreview: maskRef(record.id || 'stf', 'stf'),
    staffNameSafe: maskName(record.name),
    phoneMasked: maskPhone(record.phone),
    emailMasked: maskEmail(record.email),
    addressMasked: maskAddress(record.address),
    cnicMasked: maskCnic(),
    roleSafe: safeText(record.role || ''),
    branchSafe: safeText(record.branch || ''),
  };
}

function redactPayroll(record = {}) {
  return {
    payrollRefPreview: maskRef(record.id || 'pay', 'pay'),
    salaryRefPreview: maskSalary(),
    periodSafe: safeText(record.period || ''),
    statusPreview: `${record.status || 'unknown'}_preview`,
  };
}

function redactBank() { return { bankRefPreview: maskBankRef(), accountMasked: 'account_****' }; }
function redactPayment(record = {}) { return { paymentRefPreview: maskPaymentRef(), amountPreview: Number(record.amount || 0) }; }
function redactDocument(record = {}) {
  return { documentIdPreview: maskRef(record.id || 'doc', 'doc'), nameSafe: safeText(record.name || 'document'), statusPreview: safeText(record.status || 'unknown') };
}

// Leak detector: catches raw (unmasked) emails and raw phone numbers.
function hasLeak(obj) {
  const blob = typeof obj === 'string' ? obj : JSON.stringify(obj || {});
  const emails = blob.match(/[A-Za-z0-9._%+*-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || [];
  for (const e of emails) { if (!e.split('@')[0].includes('*')) return true; }
  if (/\d{10,}/.test(blob.replace(/\*/g, ''))) return true;
  return false;
}

module.exports = {
  maskPhone, maskEmail, maskName, maskAddress, maskRef, maskBankRef, maskPaymentRef, maskCnic, maskSalary,
  safeText, redactStaff, redactPayroll, redactBank, redactPayment, redactDocument, hasLeak,
};
