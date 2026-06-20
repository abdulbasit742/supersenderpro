// lib/saasBilling/licenseKeys.js — Generate + mask license keys.
// Full keys are NEVER persisted or returned. We store only a hash + masked form.

const crypto = require('crypto');
const { maskLicenseKey } = require('./privacy');

function generate() {
  const block = () => crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 4);
  return `SSP-${block()}-${block()}-${block()}-${block()}`;
}

function hash(key) {
  return crypto.createHash('sha256').update(String(key || '')).digest('hex');
}

function mask(key) {
  return maskLicenseKey(key);
}

// Produce the persistable record fields for a freshly issued key.
function issue() {
  const key = generate();
  return { masked: mask(key), hash: hash(key), plainOnceForDelivery: key };
}

module.exports = { generate, hash, mask, issue };
