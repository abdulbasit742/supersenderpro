// lib/tasks/privacy.js — Mask contact identifiers for views/logs.

function maskContact(c) {
 if (!c) return null;
 const s = String(c);
 if (s.includes('@')) { const [u, d] = s.split('@'); return (u.slice(0, 2) || '') + '***@' + (d || ''); }
 const digits = s.replace(/[^0-9+]/g, '');
 if (digits.length <= 4) return '****';
 return digits.slice(0, 3) + '****' + digits.slice(-2);
}

module.exports = { maskContact };
