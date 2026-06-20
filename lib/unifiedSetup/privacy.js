// lib/unifiedSetup/privacy.js — Masking helpers. The wizard never stores or returns raw
// secrets, phones, or emails. Only masked values + booleans about presence.

function maskPhone(phone) {
  if (!phone) return '';
  const d = String(phone).replace(/\D/g, '');
  return d ? `****${d.slice(-3)}` : '';
}

function maskEmail(email) {
  if (!email) return '';
  const s = String(email);
  const at = s.indexOf('@');
  if (at < 1) return '***';
  return `${s.slice(0, 2)}***@${s.slice(at + 1).replace(/^[^.]*/, '***')}`;
}

// Returns a presence/masked descriptor for an env var WITHOUT exposing its value.
function envStatus(name) {
  const v = process.env[name];
  const set = !!(v && String(v).trim());
  return { name, set, masked: set ? '••••••(set)' : '(missing)' };
}

function redact(text) {
  if (!text) return '';
  return String(text)
    .replace(/([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '$1***@[REDACTED]')
    .replace(/(\+?\d[\d\s().-]{7,}\d)/g, '[REDACTED_PHONE]')
    .replace(/\b[A-Za-z0-9_-]{24,}\b/g, '[REDACTED_TOKEN]');
}

function hasLeak(text) {
  if (!text) return false;
  let s = String(text);
  // Strip non-secret noise before checking: ISO datetimes and our internal id patterns
  // (e.g. biz_1781943_ab12, task_..., aud_...) legitimately contain digit runs.
  s = s
    .replace(/\d{4}-\d{2}-\d{2}T[\d:.]+Z?/g, '')                 // ISO datetimes
    .replace(/\b[a-z]+_\d{6,}_[a-z0-9]+/gi, '')                  // internal ids
    .replace(/"(createdAt|updatedAt|at|due|generatedAt)":\s*"[^"]*"/g, ''); // timestamp fields
  // A full, unredacted email is a leak.
  if (/@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(s) && !/\*\*\*@/.test(s) && !s.includes('[REDACTED')) return true;
  // A long unbroken digit run that survived stripping looks like a raw phone/secret.
  if ((s.match(/\d{7,}/g) || []).length) return true;
  return false;
}

module.exports = { maskPhone, maskEmail, envStatus, redact, hasLeak };
