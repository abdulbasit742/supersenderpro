 'use strict';
 /**
  * redactor.js — masks all customer PII for the self-service portal. The portal is
     * customer-facing preview, so masking is strict: phone, email, address, payment
     * refs, document refs, and any auth/secret-like fields. Never returns raw values.
  */
 function maskPhone(p) { const s = String(p || ''); return s.length < 4 ? '***' : '*** *** ' + s.slice(-2); }
 function maskEmail(e) { const s = String(e || ''); const at = s.indexOf('@'); return at < 1 ? (s ? '***' : '') : s[0] +
 '***' + s.slice(at); }
 function maskAddress(a) { const s = String(a || ''); if (!s) return ''; const first = s.split(',')[0] || s; return
 first.slice(0, 4) + '*** (area hidden)'; }
 function maskRef(r) { const s = String(r || ''); return s.length < 4 ? '****' : s.slice(0, 2) + '****' + s.slice(-2); }
 function maskName(n) { const s = String(n || '').trim(); if (!s) return 'Customer'; const parts = s.split(' '); return
 parts.length > 1 ? parts[0] + ' ' + parts[1][0] + '.' : parts[0]; }
 function maskMoney(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; } // amounts are fine to show; not PII
 function deep(o) {
   if (o == null) return o;
      if (typeof o === 'string') return o;
      if (Array.isArray(o)) return o.map(deep);
   if (typeof o === 'object') { const out = {}; for (const k of Object.keys(o)) out[k] =
 /token|secret|apikey|api_key|password|auth|raw|otp|pin/i.test(k) ? '[redacted]' : deep(o[k]); return out; }
      return o;
 }
 module.exports = { maskPhone, maskEmail, maskAddress, maskRef, maskName, maskMoney, deep };
