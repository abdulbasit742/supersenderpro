// lib/serviceCenter/redactor.js
// PII masking for the Service Center. Deep-redacts customer-sensitive fields.
'use strict';


function maskPhone(v) {
    if (!v) return v;
    const s = String(v).replace(/\s+/g, '');
    if (s.length <= 4) return '****';
    return s.slice(0, 3) + '*****' + s.slice(-2);
}

function maskEmail(v) {
  if (!v || typeof v !== 'string' || !v.includes('@')) return v ? '****' : v;
    const [u, d] = v.split('@');
    const uh = u.length <= 2 ? u[0] + '*' : u.slice(0, 2) + '***';
    return uh + '@' + d;
}

function maskName(v) {
    if (!v) return v;
    const parts = String(v).trim().split(/\s+/);
    return parts.map((p) => (p ? p[0] + '.' : p)).join(' ');
}

function maskAddress(v) {
    if (!v) return v;
    const s = String(v);
    // keep only the last token (area/city), mask the rest
    const parts = s.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length <= 1) return '*** ' + (parts[0] ? parts[0].slice(-6) : '');
    return '***, ' + parts[parts.length - 1];
}

function maskRef(v) {
  if (!v) return v;
    const s = String(v);
    if (s.length <= 4) return '****';
    return s.slice(0, 3) + '***' + s.slice(-2);
}

const PHONE_KEYS = ['phone', 'mobile', 'contact', 'whatsapp'];
const EMAIL_KEYS = ['email'];
const NAME_KEYS = ['customername', 'name', 'contactname'];
const ADDR_KEYS = ['address', 'location'];
const REF_KEYS = ['paymentref', 'paymentreference', 'cardref', 'txnref'];

function redact(obj) {
    if (obj == null) return obj;
    if (Array.isArray(obj)) return obj.map(redact);


   if (typeof obj !== 'object') return obj;
   const out = {};
   for (const [k, val] of Object.entries(obj)) {
    const key = k.toLowerCase();
    if (val && typeof val === 'object') { out[k] = redact(val); continue; }
    if (PHONE_KEYS.includes(key)) out[k] = maskPhone(val);
    else if (EMAIL_KEYS.includes(key)) out[k] = maskEmail(val);
    else if (NAME_KEYS.includes(key)) out[k] = maskName(val);
    else if (ADDR_KEYS.includes(key)) out[k] = maskAddress(val);
    else if (REF_KEYS.includes(key)) out[k] = maskRef(val);
    else out[k] = val;
   }
   return out;
}


module.exports = { maskPhone, maskEmail, maskName, maskAddress, maskRef, redact };
