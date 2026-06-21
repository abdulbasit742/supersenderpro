'use strict';
/** Redacts PII + secrets from any preview text shown during a demo. */
function redact(input) {
    if (input == null) return input;
    let s = String(input);
    s = s.replace(/([a-z0-9._%+-])[a-z0-9._%+-]*@([a-z0-9])[a-z0-9.-]*\.([a-z]{2,})/gi, '$1***@$2***.$3');
    s = s.replace(/\b(\d[\d\s-]{5,})(\d{4})\b/g, (_m, _a, last) => '****' + last);
    s = s.replace(/(bearer\s+)[a-z0-9._-]{8,}/gi, '$1[redacted]');
    s = s.replace(/\b(sk|pk)-[a-z0-9]{8,}\b/gi, '[redacted-key]');
    s = s.replace(/\beyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b/g, '[redacted-jwt]');
    return s;
}
function deep(obj) {
    if (obj == null) return obj;
    if (typeof obj === 'string') return redact(obj);
    if (Array.isArray(obj)) return obj.map(deep);
    if (typeof obj === 'object') { const o = {}; for (const k of Object.keys(obj)) { o[k] =
/token|secret|apikey|api_key|password/i.test(k) ? '[redacted]' : deep(obj[k]); } return o; }
  return obj;
}
module.exports = { redact, deep };
