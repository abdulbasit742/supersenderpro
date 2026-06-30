// lib/bulkImportExport/validators.js — Normalize + validate a mapped import row. Uses lib/contacts
// normalization when present (PK-aware phone, email), else a local fallback, so the same rules
// apply whether or not the contacts dept is installed.

let contactsNorm = null;
try { contactsNorm = require('../contacts/normalize'); } catch (_e) { contactsNorm = null; }

function _localPhone(p) {
 if (!p) return null;
 let s = String(p).trim().replace(/[\s()\-.]/g, '');
 if (s.startsWith('+')) return '+' + s.slice(1).replace(/[^0-9]/g, '');
 s = s.replace(/[^0-9]/g, '');
 if (!s) return null;
 if (s.startsWith('0092')) return '+92' + s.slice(4);
 if (s.startsWith('92')) return '+' + s;
 if (s.startsWith('0')) return '+92' + s.slice(1);
 return '+' + s;
}
function _localEmail(e) { if (!e) return null; const s = String(e).trim().toLowerCase(); return /\S+@\S+\.\S+/.test(s) ? s : null; }

function normalizePhone(p) { return contactsNorm ? contactsNorm.normalizePhone(p) : _localPhone(p); }
function normalizeEmail(e) { return contactsNorm ? contactsNorm.normalizeEmail(e) : _localEmail(e); }

// Validate a row that has already been mapped to { phone?, email?, name?, tags?, fields? }.
function validateRow(mapped, rowIndex) {
 const errors = [];
 const phone = normalizePhone(mapped.phone);
 const email = normalizeEmail(mapped.email);
 if (mapped.phone && !phone) errors.push('invalid phone');
 if (mapped.email && !email) errors.push('invalid email');
 if (!phone && !email) errors.push('missing phone and email');
 const clean = {
 phone: phone || null,
 email: email || null,
 name: mapped.name ? String(mapped.name).trim() : '',
 tags: Array.isArray(mapped.tags) ? mapped.tags : (mapped.tags ? String(mapped.tags).split(/[;|]/).map((t) => t.trim()).filter(Boolean) : []),
 fields: mapped.fields && typeof mapped.fields === 'object' ? mapped.fields : {},
 };
 return { rowIndex, valid: errors.length === 0, errors, clean };
}

module.exports = { normalizePhone, normalizeEmail, validateRow };
