'use strict';
/** Masks PII + secrets. Resellers never see other resellers' data or raw client PII. */
function maskValue(v) {
    if (v == null) return v;
    let s = String(v);
    s = s.replace(/([a-z0-9._%+-])[a-z0-9._%+-]*@([a-z0-9])[a-z0-9.-]*\.([a-z]{2,})/gi, '$1***@$2***.$3');
    s = s.replace(/\b(\d[\d\s-]{5,})(\d{4})\b/g, (_m, _a, last) => '****' + last);
    s = s.replace(/(bearer\s+)[a-z0-9._-]{8,}/gi, '$1[redacted]');
    s = s.replace(/\b(sk|pk)-[a-z0-9]{8,}\b/gi, '[redacted-key]');
    return s;
}
function maskPhone(v) { if (!v) return v; const d = String(v).replace(/\D/g, ''); return d.length < 4 ? '****' : '****' +
d.slice(-4); }
function maskDeep(obj) {
  if (obj == null) return obj;
    if (typeof obj === 'string') return maskValue(obj);
    if (Array.isArray(obj)) return obj.map(maskDeep);
    if (typeof obj === 'object') {
      const out = {};
     for (const k of Object.keys(obj)) {
       if (/token|secret|apikey|api_key|password/i.test(k)) { out[k] = '[redacted]'; continue; }
       if (/phone/i.test(k)) { out[k] = maskPhone(obj[k]); continue; }
       out[k] = maskDeep(obj[k]);
     }
     return out;
    }
    return obj;
}
module.exports = { maskValue, maskPhone, maskDeep };
