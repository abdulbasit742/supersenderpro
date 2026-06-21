 'use strict';
 /** redactor.js — mask phone/email in captured responses; never expose secrets/full PII. */
 function maskEmail(e) { const s = String(e || ''); const at = s.indexOf('@'); return at < 1 ? (s ? '***' : '') : s[0] +
 '***' + s.slice(at); }
 function maskPhone(p) { const s = String(p || ''); return s.length < 4 ? '***' : '*** *** ' + s.slice(-2); }
 function maskValueByName(name, value) {
   const n = String(name || '').toLowerCase();
      if (/email/.test(n)) return maskEmail(value);
      if (/phone|mobile|whatsapp|number/.test(n)) return maskPhone(value);
      return value;
 }
 function deep(o) {
   if (o == null) return o;
      if (typeof o === 'string') return o;
      if (Array.isArray(o)) return o.map(deep);
   if (typeof o === 'object') { const out = {}; for (const k of Object.keys(o)) out[k] =
 /token|secret|apikey|api_key|password|raw/i.test(k) ? '[redacted]' : deep(o[k]); return out; }
      return o;
 }
 module.exports = { maskEmail, maskPhone, maskValueByName, deep };
