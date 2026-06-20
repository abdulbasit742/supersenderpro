// lib/tenantIsolation/payloadScanner.js — Scan a payload for PII/secret/cross-tenant findings. Redacted previews only.
const { EMAIL, PHONE, IPV4, PAYMENT_REF } = require('./piiPatterns');
const { API_KEY, BEARER, PRIVATE_KEY, SECRET_KEY_NAMES } = require('./secretPatterns');
const { redact } = require('./redactor');

function flat(p) { try { return typeof p === 'string' ? p : JSON.stringify(p || {}); } catch (_e) { return ''; } }
function countMatches(re, s) { const m = s.match(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g')); return m ? m.length : 0; }

function scan(payload, ctx = {}) {
  const body = flat(payload);
  const findings = [];
  const add = (type, count, severity) => { if (count > 0) findings.push({ type, count, severity }); };
  add('email', countMatches(EMAIL, body), 'high');
  add('phone', countMatches(PHONE, body), 'high');
  add('ip_address', countMatches(IPV4, body), 'medium');
  add('payment_ref', countMatches(PAYMENT_REF, body), 'high');
  if (API_KEY.test(body)) add('api_key', 1, 'critical');
  if (BEARER.test(body)) add('bearer_token', 1, 'critical');
  if (PRIVATE_KEY.test(body)) add('private_key', 1, 'critical');
  // secret-like keys in object
  if (payload && typeof payload === 'object') {
    const keys = JSON.stringify(Object.keys(payload));
    if (SECRET_KEY_NAMES.test(keys)) add('secret_field_name', 1, 'high');
  }
  // cross-tenant id mismatch hint
  if (ctx.expectedTenantId && body.includes('tenantId')) {
    try { const obj = typeof payload === 'object' ? payload : JSON.parse(body); if (obj.tenantId && obj.tenantId !== ctx.expectedTenantId) add('foreign_tenant_id', 1, 'critical'); } catch (_e) { /* noop */ }
  }
  return { findings, redactedPreview: redact(body).slice(0, 400) };
}
module.exports = { scan };
