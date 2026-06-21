 'use strict';
 /**
  * redactor.js — mask phone/email/payment refs; never expose secrets or full PII.
  */
 function maskEmail(e) { const s = String(e || ''); const at = s.indexOf('@'); return at < 1 ? (s ? '***' : '') : s[0] +
 '***' + s.slice(at); }
 function maskPhone(p) { const s = String(p || ''); return s.length < 4 ? '***' : '*** *** ' + s.slice(-2); }
 function maskRef(r) { const s = String(r || ''); return s.length < 4 ? '****' : s.slice(0, 2) + '****' + s.slice(-2); }
 function maskSupplier(name) { const s = String(name || ''); return s ? s[0] + '*** (supplier)' : 'Supplier'; }
 function deep(o) {
   if (o == null) return o;
      if (typeof o === 'string') return o;
      if (Array.isArray(o)) return o.map(deep);
   if (typeof o === 'object') { const out = {}; for (const k of Object.keys(o)) out[k] =
 /token|secret|apikey|api_key|password/i.test(k) ? '[redacted]' : deep(o[k]); return out; }
      return o;
 }
 module.exports = { maskEmail, maskPhone, maskRef, maskSupplier, deep };
