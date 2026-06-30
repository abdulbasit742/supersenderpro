// lib/contacts/privacy.js — Mask phone/email/name for views + logs.

function maskPhone(p) {
 if (!p) return null;
 const s = String(p);
 const digits = s.replace(/[^0-9+]/g, '');
 if (digits.length <= 4) return '****';
 return digits.slice(0, 3) + '****' + digits.slice(-2);
}
function maskEmail(e) {
 if (!e) return null;
 const [u, d] = String(e).split('@');
 return (u ? u.slice(0, 2) : '') + '***@' + (d || '');
}
function maskName(n) {
 if (!n) return null;
 const s = String(n).trim();
 return s.length <= 1 ? s : s[0] + '***';
}

module.exports = { maskPhone, maskEmail, maskName };
