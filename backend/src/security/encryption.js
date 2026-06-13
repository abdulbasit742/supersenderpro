const crypto = require('crypto');
const env = require('../config/env');

function key() {
  const raw = env.encryptionKey || env.jwtSecret || 'dev-only-change-me';
  return crypto.createHash('sha256').update(String(raw)).digest();
}

function encryptJson(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const plaintext = Buffer.from(JSON.stringify(value || {}), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
}

function decryptJson(payload, fallback = {}) {
  if (!payload) return fallback;
  try {
    const [ivB64, tagB64, encryptedB64] = String(payload).split('.');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedB64, 'base64')), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8'));
  } catch (error) {
    console.error('[encryption:decryptJson]', error);
    return fallback;
  }
}

function hashValue(value = '') {
  return crypto.createHash('sha256').update(String(value).trim().toLowerCase()).digest('hex');
}

function maskReference(value = '') {
  const cleaned = String(value || '').replace(/\s+/g, '');
  if (cleaned.length <= 4) return cleaned;
  return `${'*'.repeat(Math.max(0, cleaned.length - 4))}${cleaned.slice(-4)}`;
}

module.exports = {
  encryptJson,
  decryptJson,
  hashValue,
  maskReference
};
