// lib/securityGateway/inputValidator.js — Safe input validation. Errors are generic, never expose secret values.
const { SUSPICIOUS_STR, SECRET_HINT, PII_HINT } = require('./abuseSignals');
const payloadSizeGuard = require('./payloadSizeGuard');

function flat(o) { try { return JSON.stringify(o || {}); } catch (_e) { return ''; } }

function hasSuspicious(body) { return SUSPICIOUS_STR.some((r) => r.test(body)); }

function validatePublicForm(input = {}, opts = {}) {
  const errors = [];
  const data = input.data || input;
  const allowed = opts.allowedFields || null;
  if (opts.requireConsent !== false && data.consent !== true) errors.push('consent_required');
  if (allowed) { Object.keys(data).forEach((k) => { if (!allowed.includes(k) && k !== 'consent') errors.push(`field_not_allowed:${k}`); }); }
  const body = flat(data);
  const size = payloadSizeGuard.check(body, opts.maxBytes || 20000);
  if (!size.ok) errors.push('payload_too_large');
  if (hasSuspicious(body)) errors.push('suspicious_input');
  if (SECRET_HINT.test(body)) errors.push('secret_in_input');
  return { ok: errors.length === 0, errors, sizeBytes: size.bytes };
}

function validateGeneric(input = {}, opts = {}) {
  const errors = [];
  const body = flat(input);
  const size = payloadSizeGuard.check(body, opts.maxBytes || 100000);
  if (!size.ok) errors.push('payload_too_large');
  if (hasSuspicious(body)) errors.push('suspicious_input');
  if (SECRET_HINT.test(body)) errors.push('secret_in_input');
  if (opts.flagPii && PII_HINT.test(body)) errors.push('pii_in_input');
  return { ok: errors.length === 0, errors, sizeBytes: size.bytes };
}

module.exports = { validatePublicForm, validateGeneric, hasSuspicious };
