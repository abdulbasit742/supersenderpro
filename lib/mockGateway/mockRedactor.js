'use strict';
const PII = require('./mockPIIPatterns');
const SECRET = require('./mockSecretPatterns');
function maskPhone(s) { const d = String(s).replace(/[^0-9]/g, ''); return d.length <= 4 ? '****' : '****' + d.slice(-3); }
function maskEmail(m) { const p = String(m).split('@'); if (p.length !== 2) return '***'; const u = p[0]; return (u.length <= 2 ? '**' : u[0] + '***' + u.slice(-1)) + '@' + p[1]; }
function redactString(str) { let s = String(str); s = s.replace(SECRET.JWT, '[REDACTED_JWT]'); s = s.replace(SECRET.BEARER, '[REDACTED_BEARER]'); s = s.replace(SECRET.OPENAI, '[REDACTED_KEY]'); s = s.replace(SECRET.API_KEY, '[REDACTED_SECRET]'); s = s.replace(PII.EMAIL, (m) => maskEmail(m)); s = s.replace(PII.PHONE, (m) => /\d{7,}/.test(m.replace(/[^0-9]/g, '')) ? maskPhone(m) : m); return s; }
const SENSITIVE_KEY = /(phone|msisdn|email|token|secret|api[_-]?key|password|authorization|bearer|session|webhook[_-]?secret|payment[_-]?ref|transaction|invite)/i;
function redact(value, depth) { depth = depth || 0; if (depth > 8 || value == null) return value; if (typeof value === 'string') return redactString(value); if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1)); if (typeof value === 'object') { const out = {}; Object.keys(value).forEach((k) => { if (SENSITIVE_KEY.test(k)) { const v = value[k]; if (/email/i.test(k)) out[k] = v ? maskEmail(v) : v; else if (/(phone|msisdn)/i.test(k)) out[k] = v ? maskPhone(v) : v; else out[k] = v ? '[REDACTED]' : v; } else out[k] = redact(value[k], depth + 1); }); return out; } return value; }
module.exports = { redact, redactString, maskPhone, maskEmail };
