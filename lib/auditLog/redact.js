// lib/auditLog/redact.js — Strip secrets/PII from metadata before it's written to the trail.
// Redacts known-sensitive keys entirely and masks phone/email-looking values. Recurses shallowly.

const SENSITIVE_KEYS = ['password', 'secret', 'token', 'apikey', 'api_key', 'authorization', 'cookie', 'signature', 'card', 'cvv', 'pin'];

function _maskValue(v) {
 const s = String(v);
 if (s.includes('@')) { const [u, d] = s.split('@'); return (u.slice(0, 2) || '') + '***@' + (d || ''); }
 if (/\+?\d{6,}/.test(s)) { const digits = s.replace(/[^0-9+]/g, ''); return digits.slice(0, 3) + '****' + digits.slice(-2); }
 return s.length > 120 ? s.slice(0, 120) + '…' : s;
}

function redact(obj, depth = 0) {
 if (obj === null || obj === undefined) return obj;
 if (typeof obj !== 'object') return _maskValue(obj);
 if (depth > 3) return '[depth-limited]';
 if (Array.isArray(obj)) return obj.slice(0, 50).map((x) => redact(x, depth + 1));
 const out = {};
 for (const [k, v] of Object.entries(obj)) {
 if (SENSITIVE_KEYS.some((s) => k.toLowerCase().includes(s))) { out[k] = '[redacted]'; continue; }
 out[k] = (typeof v === 'object' && v !== null) ? redact(v, depth + 1) : _maskValue(v);
 }
 return out;
}

module.exports = { redact, SENSITIVE_KEYS };
