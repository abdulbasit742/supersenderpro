// lib/shortLinks/codeGen.js — Generate short, URL-safe, unambiguous codes (no 0/O/1/l/I).

const crypto = require('crypto');
const ALPHABET = '23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';

function generate(length = 7) {
 const bytes = crypto.randomBytes(length);
 let out = '';
 for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
 return out;
}

module.exports = { generate, ALPHABET };
