// lib/auditLog/hashChain.js — Tamper-evident hash chaining. Each record's hash =
// SHA-256(prevHash + canonical(record-without-hash)). Any change to a past record (or a deletion)
// breaks every subsequent hash, so verify() can pinpoint the first broken link.

const crypto = require('crypto');

// Deterministic serialization: sorted keys, excluding the record's own hash field.
function canonical(record) {
 const { hash, ...rest } = record; // exclude hash itself
 const sortKeys = (v) => {
 if (Array.isArray(v)) return v.map(sortKeys);
 if (v && typeof v === 'object') return Object.keys(v).sort().reduce((a, k) => { a[k] = sortKeys(v[k]); return a; }, {});
 return v;
 };
 return JSON.stringify(sortKeys(rest));
}

function computeHash(prevHash, record) {
 return crypto.createHash('sha256').update(String(prevHash) + '|' + canonical(record)).digest('hex');
}

// Verify a chain starting from anchorHash. Returns { valid, brokenAt, length }.
function verify(records, anchorHash = 'GENESIS') {
 let prev = anchorHash;
 for (let i = 0; i < records.length; i++) {
 const r = records[i];
 const expected = computeHash(prev, r);
 if (r.hash !== expected) return { valid: false, brokenAt: i, recordId: r.id, length: records.length };
 prev = r.hash;
 }
 return { valid: true, brokenAt: -1, length: records.length };
}

module.exports = { canonical, computeHash, verify };
