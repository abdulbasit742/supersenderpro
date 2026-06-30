// lib/coupons/codeGen.js — Generate readable, unambiguous coupon codes (no 0/O/1/I) in upper-case,
// optionally with a prefix like 'EID-'. Used for auto + bulk code generation.

const crypto = require('crypto');
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function generate(length = 8, prefix = '') {
 const bytes = crypto.randomBytes(length);
 let out = '';
 for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
 return (prefix ? String(prefix).toUpperCase().replace(/[^A-Z0-9]/g, '') + '-' : '') + out;
}

module.exports = { generate, ALPHABET };
