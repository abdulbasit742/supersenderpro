'use strict';

/**
 * Pilot Ops — PII masking + redaction. Full phone/email/name never stored or returned.
    */

function maskPhone(v) {
  if (!v) return null;
     const d = String(v).replace(/[^0-9]/g, '');
     if (d.length <= 4) return '****';
     return d.slice(0, 2) + '****' + d.slice(-2);
}

function maskEmail(v) {
     if (!v || typeof v !== 'string' || v.indexOf('@') === -1) return null;
     const p = v.split('@');
     const u = p[0].length <= 2 ? '**' : p[0][0] + '***' + p[0].slice(-1);
     return u + '@' + p[1];
}
// Owner name: keep first name + initial only.
function safeName(v) {
  if (!v) return null;
     const parts = String(v).trim().split(/\s+/);
     if (parts.length === 1) return parts[0];
     return parts[0] + ' ' + parts[1][0] + '.';
}
function safePreview(s, max) {
  if (!s) return null;
     let out = String(s).slice(0, max || 160);
     out = out.replace(/\b\d{7,}\b/g, function (m) { return m.slice(0, 2) + '****' + m.slice(-2); });
  out = out.replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, function (m) { const p = m.split('@'); return p[0][0] +
'***@' + p[1]; });
     return out;
}

const SENSITIVE_RE = /(phone|msisdn|email|token|secret|api[_-]?key|password|authorization|bearer)/i;
function redact(value, depth) {
  depth = depth || 0;
     if (depth > 6 || value == null) return value;
     if (Array.isArray(value)) return value.map(function (v) { return redact(v, depth + 1); });
     if (typeof value === 'object') {
       const out = {};
       Object.keys(value).forEach(function (k) {
         if (SENSITIVE_RE.test(k)) {
           if (/email/i.test(k)) out[k] = maskEmail(value[k]);
           else if (/(phone|msisdn)/i.test(k)) out[k] = maskPhone(value[k]);
           else out[k] = value[k] ? '****' : null;
         } else out[k] = redact(value[k], depth + 1);
       });
       return out;
     }
     if (typeof value === 'string') return safePreview(value, 2000);
     return value;
}

module.exports = { maskPhone, maskEmail, safeName, safePreview, redact };
