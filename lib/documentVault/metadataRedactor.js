 'use strict';
 /**
  * metadataRedactor.js — masks phone/email/payment/account/document refs and owner
     * names in document METADATA. Never handles file contents. No secrets exposed.
     */
 function maskEmail(e) { const s = String(e || ''); const at = s.indexOf('@'); return at < 1 ? (s ? '***' : '') : s[0] +
 '***' + s.slice(at); }
 function maskPhone(p) { const s = String(p || ''); return s.length < 4 ? '***' : '*** *** ' + s.slice(-2); }
 function maskRef(r) { const s = String(r || ''); return s.length < 4 ? '****' : s.slice(0, 2) + '****' + s.slice(-2); }
 function maskName(n) { const s = String(n || ''); return s ? s[0] + '*** ' : 'Owner'; }
 function maskFileName(f) {
      const s = String(f || '');
      const dot = s.lastIndexOf('.');
      const ext = dot > -1 ? s.slice(dot) : '';
      const base = dot > -1 ? s.slice(0, dot) : s;
      return (base.length <= 3 ? base[0] || 'f' : base.slice(0, 3)) + '***' + ext;
 }
 function scanSensitive(text) {
   const t = String(text || '');
      const found = [];
      if (/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/.test(t)) found.push('email');
      if (/\b\+?\d[\d ().-]{8,}\d\b/.test(t)) found.push('phone');
      if (/\b(?:\d[ -]?){12,19}\b/.test(t)) found.push('card_like');
      if (/(sk|pk|rk)_[A-Za-z0-9]{12,}/.test(t)) found.push('secret_like');
      return found;
 }
 function deep(o) {
      if (o == null) return o;
      if (typeof o === 'string') return o;
      if (Array.isArray(o)) return o.map(deep);
      if (typeof o === 'object') { const out = {}; for (const k of Object.keys(o)) out[k] =
 /token|secret|apikey|api_key|password|raw|content|base64|filebody/i.test(k) ? '[redacted]' : deep(o[k]); return out; }
   return o;
 }
 module.exports = { maskEmail, maskPhone, maskRef, maskName, maskFileName, scanSensitive, deep };
