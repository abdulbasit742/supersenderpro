'use strict';
function maskPhone(value) { if (value == null) return value; const d = String(value).replace(/\D/g, ''); return d.length < 4 ? '***' : '*'.repeat(Math.max(0, d.length - 4)) + d.slice(-4); }
function maskEmail(value) { if (value == null) return value; const s = String(value); const at = s.indexOf('@'); return at <= 0 ? '***' : s.slice(0,1) + '***@' + s.slice(at + 1); }
function maskPaymentRef(value) { if (value == null) return value; const s = String(value); return s.length <= 4 ? '****' : '****' + s.slice(-4); }
function maskByKey(key, value) { const k = String(key); if (/(phone|mobile|whatsapp|msisdn|contact)/i.test(k)) return maskPhone(value); if (/(email|e-mail)/i.test(k)) return maskEmail(value); if (/(card|iban|account|payment|txn|transaction|ref)/i.test(k)) return maskPaymentRef(value); return value; }
function redactObject(obj, depth = 0) { if (obj == null || depth > 6) return obj; if (Array.isArray(obj)) return obj.map((v) => redactObject(v, depth + 1)); if (typeof obj !== 'object') return obj; const out = {}; for (const [k, v] of Object.entries(obj)) out[k] = v && typeof v === 'object' ? redactObject(v, depth + 1) : maskByKey(k, v); return out; }
module.exports = { maskPhone, maskEmail, maskPaymentRef, maskByKey, redactObject };
