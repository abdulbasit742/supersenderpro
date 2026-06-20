'use strict';
// Strip secrets / private data before any context is handed to an external agent.
const SECRET_KEY = /(token|secret|password|passwd|api[_-]?key|authorization|auth|cookie|session|priv(ate)?[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|cvv|card[_-]?number|pan|otp)/i;
const SECRET_VALUE = [
  /\b[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}\b/g, // JWT-ish
  /\bsk-[A-Za-z0-9]{16,}\b/g,        // OpenAI-style keys
  /\bghp_[A-Za-z0-9]{20,}\b/g,       // GitHub PAT
  /\bAKIA[0-9A-Z]{16}\b/g            // AWS access key id
];
const REDACTED = '[REDACTED]';

function scrubString(s) {
  let out = String(s);
  for (const re of SECRET_VALUE) out = out.replace(re, REDACTED);
  return out;
}

function sanitize(value, depth = 0) {
  if (depth > 8) return value;
  if (value == null) return value;
  if (typeof value === 'string') return scrubString(value);
  if (Array.isArray(value)) return value.map(v => sanitize(v, depth + 1));
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = SECRET_KEY.test(k) ? REDACTED : sanitize(v, depth + 1);
    }
    return out;
  }
  return value;
}

module.exports = { sanitize, scrubString };
