// lib/voiceAI/redaction.js — Redact sensitive data from any text before it is stored,
// logged, or returned in an API response. Removes phone numbers, emails, tokens, and
// payment references so previews never leak PII.

const PHONE_RE = /(\+?\d[\d\s().-]{7,}\d)/g;
const EMAIL_RE = /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
const TOKEN_RE = /\b([A-Za-z0-9_-]{24,})\b/g; // long tokens / api keys
const CARD_RE = /\b(?:\d[ -]*?){13,19}\b/g;
const PAYMENT_REF_RE = /\b(TRX|TXN|REF|INV|ORDER|PAY)[-_ ]?[A-Za-z0-9]{4,}\b/gi;

function redactText(input) {
  if (input === undefined || input === null) return '';
  let s = String(input);
  s = s.replace(CARD_RE, (m) => (m.replace(/\d/g, '').length >= 0 && m.replace(/\D/g, '').length >= 13 ? '[REDACTED_CARD]' : m));
  s = s.replace(EMAIL_RE, (_m, u) => `${u.slice(0, 2)}***@[REDACTED_EMAIL]`);
  s = s.replace(PHONE_RE, (m) => {
    const digits = m.replace(/\D/g, '');
    if (digits.length < 8) return m;
    return `[REDACTED_PHONE_*${digits.slice(-3)}]`;
  });
  s = s.replace(PAYMENT_REF_RE, '[REDACTED_REF]');
  s = s.replace(TOKEN_RE, (m) => (/^\d+$/.test(m) ? m : '[REDACTED_TOKEN]'));
  return s;
}

// Mask a phone number for display: keep last 3 digits only.
function maskPhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return '';
  return `****${digits.slice(-3)}`;
}

// Mask a voice id / provider id: keep first 2 + last 2 chars.
function maskId(id) {
  if (!id) return '';
  const s = String(id);
  if (s.length <= 5) return `${s[0] || ''}***`;
  return `${s.slice(0, 2)}***${s.slice(-2)}`;
}

// Mask a customer name: keep first name + initial only.
function maskName(name) {
  if (!name) return 'Customer';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1][0]}.`;
}

// Make a short, redacted preview of arbitrary text.
function preview(text, max = 160) {
  const r = redactText(text);
  if (r.length <= max) return r;
  return `${r.slice(0, max)}…`;
}

// Verify text contains no obvious leaked PII (used by smoke tests).
function hasLeak(text) {
  if (!text) return false;
  const s = String(text);
  // A raw 11+ digit phone-like run or a full email is considered a leak.
  if (/@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(s) && !s.includes('[REDACTED')) {
    // allow masked emails
    if (!/\*\*\*@\[REDACTED_EMAIL\]/.test(s)) return true;
  }
  const longDigits = (s.match(/\d{7,}/g) || []);
  if (longDigits.length) return true;
  return false;
}

module.exports = { redactText, maskPhone, maskId, maskName, preview, hasLeak };
