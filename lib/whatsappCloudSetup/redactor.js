// lib/whatsappCloudSetup/redactor.js — Masking + leak detection. Never returns real tokens or full phone numbers.
'use strict';

// Mask a phone number: keep country prefix + last 2 digits, bullet the rest.
function maskPhone(v) {
  if (!v) return '';
  const s = String(v).replace(/[^\d+]/g, '');
  if (s.length <= 4) return '••••';
  const head = s.startsWith('+') ? s.slice(0, 3) : s.slice(0, 2);
  const tail = s.slice(-2);
  return `${head}${'•'.repeat(Math.max(3, s.length - head.length - 2))}${tail}`;
}

// Mask an identifier (WABA id, phone number id, app id): keep last 4 chars only.
function maskId(v) {
  if (!v) return '';
  const s = String(v);
  if (s.includes('•')) return s; // already masked
  if (s.length <= 4) return '••••';
  return `${'•'.repeat(Math.min(8, s.length - 4))}${s.slice(-4)}`;
}

// Tokens are NEVER echoed — always a fixed placeholder.
function maskToken() {
  return '••••••••(hidden)';
}

// Replace emails/phones inside free text.
function redactText(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '••••@••••')
    .replace(/\+?\d[\d\s().-]{8,}\d/g, (m) => maskPhone(m));
}

// Deep-redact an object for safe output.
function redactPII(obj) {
  if (obj == null) return obj;
  if (typeof obj === 'string') return redactText(obj);
  if (Array.isArray(obj)) return obj.map(redactPII);
  if (typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (/token|secret|password|apikey|api_key/i.test(k) && typeof v === 'string' && v) {
        out[k] = maskToken();
      } else {
        out[k] = redactPII(v);
      }
    }
    return out;
  }
  return obj;
}

// Detect leaks of real secrets / PII in a value (used by check + smoke).
function hasLeak(obj) {
  const blob = typeof obj === 'string' ? obj : JSON.stringify(obj || {});
  // Meta long-lived tokens
  if (/EAA[A-Za-z0-9]{20,}/.test(blob)) return true;
  // Raw email addresses
  if (/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(blob)) return true;
  // Bare phone numbers (10-15 consecutive digits, not bulleted)
  if (/\+?\b\d{10,15}\b/.test(blob)) return true;
  return false;
}

module.exports = { maskPhone, maskId, maskToken, redactText, redactPII, hasLeak };
