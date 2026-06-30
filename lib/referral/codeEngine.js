'use strict';
// #74 Referral Program — code generation + lookup.
const crypto = require('crypto');
const config = require('./config');
const store = require('./store');

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars

function gen(len) {
  const n = len || config.codeLength;
  let out = '';
  const bytes = crypto.randomBytes(n);
  for (let i = 0; i < n; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

// Get or create a stable referral code for an owner (one active code per owner).
function getOrCreate(db, { tenantId, ownerId }) {
  if (!ownerId) throw new Error('ownerId required');
  const existing = Object.values(db.codes).find(c => c.tenantId === (tenantId || 'default') && c.ownerId === ownerId);
  if (existing) return existing;
  let code;
  do { code = gen(); } while (db.codes[code]);
  db.codes[code] = { code, tenantId: tenantId || 'default', ownerId, uses: 0, createdAt: new Date().toISOString() };
  return db.codes[code];
}

module.exports = { gen, getOrCreate };
