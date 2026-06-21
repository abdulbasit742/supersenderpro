'use strict';


/**
    * Reseller Portal QA — referral code validator. Pure function. Ensures codes are
    * safe (alphanumeric-ish, no PII patterns).
    */

function validate(code) {
  const c = String(code == null ? '' : code).trim();
     const warnings = [], blockers = [];
     if (!c) { blockers.push('Referral code is empty.'); return { valid: false, code: c, blockers: blockers, warnings:
warnings }; }
  if (c.length < 3 || c.length > 40) warnings.push('Referral code length unusual (expected 3-40 chars).');
     if (!/^[a-zA-Z0-9_-]+$/.test(c)) blockers.push('Referral code has unsafe characters; use [a-zA-Z0-9_-] only.');
     if (/\b\d{10,15}\b/.test(c)) blockers.push('Referral code looks like a phone number.');
     if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(c)) blockers.push('Referral code contains an email.');
     return { valid: blockers.length === 0, code: c, blockers: blockers, warnings: warnings };
}

// Detect duplicate codes across a list of referral records.
function findDuplicates(codes) {
     const seen = {}, dups = [];
     (Array.isArray(codes) ? codes : []).forEach(function (c) { const k = String(c || '').toLowerCase(); if (k) { seen[k] =
(seen[k] || 0) + 1; if (seen[k] === 2) dups.push(c); } });
  return dups;
}

module.exports = { validate, findDuplicates };
