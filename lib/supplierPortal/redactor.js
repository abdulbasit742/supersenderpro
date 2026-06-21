  'use strict';
  /**
   * redactor.js — strict masking for the vendor-facing portal: phone, email,
   * payment refs, bank account/IBAN, tax/NTN/GST numbers, document refs. Never
   * returns raw values; never exposes secrets.
   */
  function maskPhone(p) { const s = String(p || ''); return s.length < 4 ? '***' : '*** *** ' + s.slice(-2); }
  function maskEmail(e) { const s = String(e || ''); const at = s.indexOf('@'); return at < 1 ? (s ? '***' : '') : s[0] +
  '***' + s.slice(at); }
  function maskRef(r) { const s = String(r || ''); return s.length < 4 ? '****' : s.slice(0, 2) + '****' + s.slice(-2); }
  function maskBank(b) { const s = String(b || '').replace(/\s+/g, ''); return s.length < 4 ? '****' : '**** **** ' +
  s.slice(-4); }
  function maskTax(t) { const s = String(t || ''); return s.length < 3 ? '***' : s.slice(0, 2) + '****' + s.slice(-2); }
  function maskName(n) { const s = String(n || '').trim(); if (!s) return 'Supplier'; const parts = s.split(' '); return
  parts.length > 1 ? parts[0] + ' ' + parts[1][0] + '.' : parts[0]; }
  function deep(o) {
    if (o == null) return o;
    if (typeof o === 'string') return o;
    if (Array.isArray(o)) return o.map(deep);
    if (typeof o === 'object') { const out = {}; for (const k of Object.keys(o)) out[k] =
  /token|secret|apikey|api_key|password|auth|raw|iban|account_no|accountnumber|swift/i.test(k) ? '[redacted]' : deep(o[k]);
  return out; }
    return o;
  }
  module.exports = { maskPhone, maskEmail, maskRef, maskBank, maskTax, maskName, deep };
