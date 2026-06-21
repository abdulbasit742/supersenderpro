'use strict';
const SECRET_KEY = /token|secret|apikey|api_key|password|authorization|raw/i;
function maskPhone(v) { const d = String(v || '').replace(/[^0-9]/g, ''); if (d.length <= 4) return d ? '••' : null; return d.slice(0,2) + '•'.repeat(Math.max(2,d.length-4)) + d.slice(-2); }
function maskEmail(v) { const s = String(v || ''); const at = s.indexOf('@'); if (at < 1) return s ? '•••' : null; return s.slice(0,2) + '•'.repeat(Math.max(1,at-2)) + '@' + s.slice(at+1); }
function maskRef(v) { const s = String(v || ''); if (s.length <= 4) return s ? '••' : null; return s.slice(0,3) + '••••' + s.slice(-2); }
function maskActor(v) { const s = String(v || '').trim(); if (!s) return 'user'; if (s.includes('@')) return maskEmail(s); if (/\d{5,}/.test(s)) return maskPhone(s); const p = s.split(/\s+/); return p.length > 1 ? p[0] + ' ' + p[1][0] + '.' : p[0]; }
function safeName(v) { const s = String(v || '').trim(); if (!s) return 'Customer'; const p = s.split(/\s+/); return p.length > 1 ? p[0] + ' ' + p[1][0] + '.' : p[0]; }
function redactDeep(value, depth) { const d = depth || 0; if (d > 7 || value == null) return value; if (typeof value === 'string') return value.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, maskEmail).replace(/\b\+?\d[\d\s().-]{6,}\d\b/g, maskPhone); if (Array.isArray(value)) return value.slice(0,300).map((v)=>redactDeep(v,d+1)); if (typeof value === 'object') { const out={}; for (const k of Object.keys(value)) out[k] = SECRET_KEY.test(k) ? '[redacted]' : redactDeep(value[k], d+1); return out; } return value; }
function redactObject(o) { return redactDeep(o); }
module.exports = { maskPhone, maskEmail, maskRef, maskActor, safeName, redactDeep, redactObject };
