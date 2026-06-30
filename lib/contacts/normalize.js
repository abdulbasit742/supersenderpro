// lib/contacts/normalize.js — Phone + email normalization so the same person isn't stored twice.
// Pakistan-aware: 03xxxxxxxxx -> +923xxxxxxxxx, 0092/92 prefixes handled. Falls back to digit
// normalization for other inputs. Email is lowercased + trimmed.

function normalizePhone(input, country = 'PK') {
 if (!input) return null;
 let s = String(input).trim().replace(/[\s()\-.]/g, '');
 if (s.startsWith('+')) return '+' + s.slice(1).replace(/[^0-9]/g, '');
 s = s.replace(/[^0-9]/g, '');
 if (!s) return null;
 if (country === 'PK') {
 if (s.startsWith('0092')) return '+92' + s.slice(4);
 if (s.startsWith('92')) return '+' + s;
 if (s.startsWith('0')) return '+92' + s.slice(1); // 03xx... -> +923xx...
 if (s.length === 10 && s.startsWith('3')) return '+92' + s; // 3xx... -> +923xx...
 }
 return '+' + s;
}
function normalizeEmail(input) {
 if (!input) return null;
 const s = String(input).trim().toLowerCase();
 return /\S+@\S+\.\S+/.test(s) ? s : null;
}
// Build the canonical identity key for dedupe: prefer phone, else email.
function identityKey({ phone, email } = {}, country = 'PK') {
 const p = normalizePhone(phone, country);
 if (p) return 'p:' + p;
 const e = normalizeEmail(email);
 if (e) return 'e:' + e;
 return null;
}

module.exports = { normalizePhone, normalizeEmail, identityKey };
