'use strict';


/** SaaS Billing — PII/ref masker. Emails/phones/payment refs never returned raw. */

function maskPhone(v) { if (!v) return null; const d = String(v).replace(/[^0-9]/g, ''); return d.length <= 4 ? '****' :
'****' + d.slice(-3); }
function maskEmail(v) { if (!v || typeof v !== 'string' || v.indexOf('@') === -1) return null; const p = v.split('@');
const u = p[0].length <= 2 ? '**' : p[0][0] + '***' + p[0].slice(-1); return u + '@' + p[1]; }
function maskRef(v) { if (!v) return null; const s = String(v); return s.length <= 4 ? '****' : s.slice(0, 2) + '***' +
s.slice(-2); }


const SENSITIVE = /(phone|msisdn|email|token|secret|api[_-]?key|payment[_-]?ref|transaction|card|cvv|iban)/i;
function redact(value, depth) {
    depth = depth || 0;
    if (depth > 8 || value == null) return value;
  if (typeof value === 'string') return value.replace(/\b\d{10,}\b/g, function (m) { return m.slice(0, 2) + '****' +
m.slice(-2); }).replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, function (m) { const p = m.split('@'); return p[0][0]
+ '***@' + p[1]; });
  if (Array.isArray(value)) return value.map(function (v) { return redact(v, depth + 1); });
    if (typeof value === 'object') {
      const out = {};
     Object.keys(value).forEach(function (k) {
       if (SENSITIVE.test(k)) { const v = value[k]; if (/email/i.test(k)) out[k] = v ? maskEmail(v) : v; else if
(/(phone|msisdn)/i.test(k)) out[k] = v ? maskPhone(v) : v; else out[k] = v ? '[REDACTED]' : v; }
      else out[k] = redact(value[k], depth + 1);
     });
     return out;
    }
    return value;
}

module.exports = { maskPhone, maskEmail, maskRef, redact };
