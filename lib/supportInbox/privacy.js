// lib/supportInbox/privacy.js — Mask contact identifiers so stored tickets never hold raw PII
// in fields meant for display/logging. The full contact is kept only in the dedicated
// contact field for routing; masked variants are used everywhere else.

function maskContact(c) {
 if (!c) return null;
 const s = String(c);
 if (s.includes('@')) { const [u, d] = s.split('@'); return (u.slice(0, 2) || '') + '***@' + (d || ''); }
 const digits = s.replace(/[^0-9+]/g, '');
 if (digits.length <= 4) return '****';
 return digits.slice(0, 3) + '****' + digits.slice(-2);
}
function maskName(n) {
 if (!n) return null;
 const s = String(n).trim();
 if (s.length <= 1) return s;
 return s[0] + '***';
}

module.exports = { maskContact, maskName };
