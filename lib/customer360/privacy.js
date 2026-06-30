// lib/customer360/privacy.js — Mask contact identifiers + sanitize event meta (drop PII-ish values).

function maskContact(c) {
 if (!c) return null;
 const s = String(c);
 if (s.includes('@')) { const [u, d] = s.split('@'); return (u.slice(0, 2) || '') + '***@' + (d || ''); }
 const digits = s.replace(/[^0-9+]/g, '');
 if (digits.length <= 4) return '****';
 return digits.slice(0, 3) + '****' + digits.slice(-2);
}
// Keep event meta small + free of obvious PII / message bodies.
function sanitizeMeta(meta) {
 if (!meta || typeof meta !== 'object') return {};
 const out = {};
 let count = 0;
 for (const [k, v] of Object.entries(meta)) {
 if (count >= 12) break;
 const key = String(k).slice(0, 32);
 if (/body|message|text|content|password|secret|token/i.test(key)) continue; // never store bodies/secrets
 let val = (v === null || v === undefined) ? null : (typeof v === 'object' ? JSON.stringify(v).slice(0, 80) : String(v).slice(0, 80));
 if (val && /@|\+?\d{6,}/.test(val)) val = 'redacted';
 out[key] = val; count += 1;
 }
 return out;
}

module.exports = { maskContact, sanitizeMeta };
