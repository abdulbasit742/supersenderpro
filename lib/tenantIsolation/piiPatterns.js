// lib/tenantIsolation/piiPatterns.js — PII detection patterns (used for leak detection, not storage).
const EMAIL = /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
const PHONE = /(\+?\d[\d\s().-]{7,}\d)/g;
const IPV4 = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
const PAYMENT_REF = /\b(?:txn|trx|pay|inv|order)[_-]?[A-Za-z0-9]{5,}\b/gi;
const LONG_DIGITS = /\b\d{9,}\b/g; // long numeric runs (account/card/txn-like)
module.exports = { EMAIL, PHONE, IPV4, PAYMENT_REF, LONG_DIGITS };
