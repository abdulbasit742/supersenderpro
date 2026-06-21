  'use strict';
  /**
   * redactor.js — mask payment refs, account refs, phone/email, payer/payee names.
      * Never expose secrets or full PII.
      */
  function maskRef(r) { const s = String(r || ''); return s.length < 4 ? '****' : s.slice(0, 2) + '****' + s.slice(-2); }
  function maskAccount(a) { const s = String(a || ''); return s.length < 4 ? '****' : '****' + s.slice(-4); }
  function maskName(n) { const s = String(n || ''); return s ? s[0] + '*** ' : 'Party'; }
  function maskPhone(p) { const s = String(p || ''); return s.length < 4 ? '***' : '*** *** ' + s.slice(-2); }
  function maskEmail(e) { const s = String(e || ''); const at = s.indexOf('@'); return at < 1 ? (s ? '***' : '') : s[0] +
  '***' + s.slice(at); }
  function deep(o) {
    if (o == null) return o;
       if (typeof o === 'string') return o;
       if (Array.isArray(o)) return o.map(deep);
    if (typeof o === 'object') { const out = {}; for (const k of Object.keys(o)) out[k] =
  /token|secret|apikey|api_key|password|raw/i.test(k) ? '[redacted]' : deep(o[k]); return out; }
       return o;
  }
  module.exports = { maskRef, maskAccount, maskName, maskPhone, maskEmail, deep };
