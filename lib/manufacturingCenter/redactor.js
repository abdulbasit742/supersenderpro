  'use strict';
  /** redactor.js — mask supplier/staff names + payment refs; never expose secrets or full PII. */
  function maskRef(r) { const s = String(r || ''); return s.length < 4 ? '****' : s.slice(0, 2) + '****' + s.slice(-2); }
  function maskName(n) { const s = String(n || ''); return s ? s[0] + '*** ' : 'Party'; }
  function maskStaff(n) { const s = String(n || ''); return s ? s[0] + '*** (staff)' : 'Staff'; }
  function deep(o) {
    if (o == null) return o;
       if (typeof o === 'string') return o;
       if (Array.isArray(o)) return o.map(deep);
    if (typeof o === 'object') { const out = {}; for (const k of Object.keys(o)) out[k] =
  /token|secret|apikey|api_key|password|raw/i.test(k) ? '[redacted]' : deep(o[k]); return out; }
       return o;
  }
  module.exports = { maskRef, maskName, maskStaff, deep };
