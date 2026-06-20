// lib/ownerBriefing/privacy.js — Redaction helpers. Briefings never expose raw phones, emails,
// tokens, or payment references.

function redact(text) {
  if (text === undefined || text === null) return '';
  return String(text)
    .replace(/([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, (_m, u) => `${u.slice(0,2)}***@[REDACTED]`)
    .replace(/(\+?\d[\d\s().-]{7,}\d)/g, '[REDACTED_PHONE]')
    .replace(/\b(TRX|TXN|REF|INV|ORDER|PAY)[-_ ]?[A-Za-z0-9]{4,}\b/gi, '[REDACTED_REF]')
    .replace(/\b[A-Za-z0-9_-]{24,}\b/g, '[REDACTED_TOKEN]');
}
function maskName(name) {
  if (!name) return 'Customer';
  const parts = String(name).trim().split(/\s+/);
  return parts.length === 1 ? parts[0] : `${parts[0]} ${parts[1][0]}.`;
}
function hasLeak(text) {
  if (!text) return false;
  let s = String(text)
    .replace(/\d{4}-\d{2}-\d{2}T[\d:.]+Z?/g, '')
    .replace(/\b[a-z]+_\d{6,}_[a-z0-9]+/gi, '');
  if (/@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(s) && !/\*\*\*@/.test(s) && !s.includes('[REDACTED')) return true;
  if ((s.match(/\d{7,}/g) || []).length) return true;
  return false;
}
module.exports = { redact, maskName, hasLeak };
