// lib/tenantIsolation/redactor.js — Redaction + leak heuristics. No raw PII/secret may pass through.
const { EMAIL, PHONE, IPV4 } = require('./piiPatterns');
const { SECRET_KEY_NAMES } = require('./secretPatterns');

function redact(text) {
  if (text === undefined || text === null) return '';
  return String(text)
    .replace(EMAIL, (_m, u) => `${u.slice(0, 2)}***@[REDACTED]`)
    .replace(PHONE, '[REDACTED_PHONE]')
    .replace(IPV4, '[REDACTED_IP]')
    .replace(/\b[A-Za-z0-9_-]{24,}\b/g, '[REDACTED_TOKEN]');
}
function redactObject(obj, depth = 0) {
  if (depth > 6 || obj == null) return obj;
  if (typeof obj === 'string') return redact(obj);
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map((v) => redactObject(v, depth + 1));
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (SECRET_KEY_NAMES.test(k)) { out[k] = '[REDACTED_SECRET]'; continue; }
    if (/^ip$|ipaddress|remoteaddr/i.test(k)) { out[k] = '[REDACTED_IP]'; continue; }
    out[k] = redactObject(v, depth + 1);
  }
  return out;
}
function hasLeak(text) {
  if (!text) return false;
  let s = String(text).replace(/\d{4}-\d{2}-\d{2}T[\d:.]+Z?/g, '').replace(/\b[a-z]+_[a-z0-9]{6,}\b/gi, '');
  if (/@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(s) && !/\*\*\*@/.test(s) && !s.includes('[REDACTED')) return true;
  if (/\b(?:\d{1,3}\.){3}\d{1,3}\b/.test(s)) return true;
  if ((s.match(/\d{9,}/g) || []).length) return true;
  return false;
}
module.exports = { redact, redactObject, hasLeak };
