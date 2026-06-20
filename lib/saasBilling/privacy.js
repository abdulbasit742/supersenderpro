// lib/saasBilling/privacy.js — Masking helpers + leak detection.
// Used everywhere before returning data via API/UI so we never expose full
// license keys, payment references, phones, emails, tokens, or secrets.

function maskEmail(email) {
  const s = String(email || '').trim();
  if (!s || !s.includes('@')) return '';
  const [user, domain] = s.split('@');
  const head = user.slice(0, 2);
  return `${head}${'*'.repeat(Math.max(1, user.length - 2))}@${domain}`;
}

function maskPhone(phone) {
  const s = String(phone || '').replace(/\s+/g, '');
  if (!s) return '';
  if (s.length <= 4) return '*'.repeat(s.length);
  return `${'*'.repeat(s.length - 4)}${s.slice(-4)}`;
}

// Mask a license key / payment reference: show last 4 chars only.
function maskReference(ref) {
  const s = String(ref || '').trim();
  if (!s) return '';
  if (s.length <= 4) return '*'.repeat(s.length);
  return `${s.slice(0, 4)}…${'*'.repeat(Math.max(1, s.length - 8))}${s.slice(-4)}`;
}

function maskLicenseKey(key) {
  const s = String(key || '').trim();
  if (!s) return '';
  const head = (s.split('-')[0] || s.slice(0, 4)).slice(0, 4);
  return `${head}-****-****-${s.slice(-4)}`;
}

// Detect obvious secret/PII leaks in an outbound payload string.
const LEAK_PATTERNS = [
  /\bsk_(live|test)_[A-Za-z0-9]{8,}/i,        // stripe secret
  /\bAKIA[0-9A-Z]{16}\b/,                      // aws key
  /\b[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/, // jwt
  /"(password|secret|apiKey|api_key|token|clientSecret|webhookSecret)"\s*:\s*"[^"]{4,}"/i,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
];

function hasLeak(payloadStr) {
  const s = String(payloadStr || '');
  return LEAK_PATTERNS.some((re) => re.test(s));
}

// Strip known sensitive keys from any object before serialization.
const SENSITIVE_KEYS = new Set([
  'licenseKey', 'paymentReference', 'paymentRef', 'secret', 'password',
  'apiKey', 'api_key', 'token', 'clientSecret', 'webhookSecret', 'privateKey',
]);

function sanitize(obj) {
  if (Array.isArray(obj)) return obj.map(sanitize);
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (SENSITIVE_KEYS.has(k)) continue;
      out[k] = sanitize(v);
    }
    return out;
  }
  return obj;
}

module.exports = { maskEmail, maskPhone, maskReference, maskLicenseKey, hasLeak, sanitize };
