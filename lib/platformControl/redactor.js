// lib/platformControl/redactor.js
// Read-only redaction helpers for Platform Control. No PII, secrets, or stack traces ever leave the API.
'use strict';

const path = require('path');

function str(v) { return (v === undefined || v === null) ? '' : String(v); }

function maskPhone(phone) {
  const digits = str(phone).replace(/[^\d+]/g, '');
  if (!digits) return 'not_configured';
  if (digits.length <= 7) return digits.slice(0, 2) + '****';
  const prefix = digits.slice(0, 3);
  const suffix = digits.slice(-4);
  const stars = '*'.repeat(Math.max(2, digits.length - 7));
  return prefix + stars + suffix;
}

function maskEmail(email) {
  const s = str(email);
  const m = s.match(/^([^@\s]+)@(.+)$/);
  if (!m) return s ? 'masked' : 'not_configured';
  const keep = m[1].slice(0, 2);
  return keep + '***@' + m[2];
}

function maskName(name) {
  const s = str(name).trim();
  if (!s) return 'not_configured';
  return s.slice(0, 1) + '***';
}

function maskToken(token) {
  const s = str(token);
  if (!s) return 'not_configured';
  return s.slice(0, 6) + '_****';
}

function maskSecret(value) {
  const s = str(value);
  if (!s) return 'not_configured';
  return s.slice(0, 6) + '_****';
}

function maskRef(ref) {
  const s = str(ref);
  if (!s) return 'not_configured';
  const i = s.lastIndexOf('_');
  return i > 0 ? s.slice(0, i) + '_****' : s.slice(0, 4) + '****';
}

function maskPath(p) {
  let s = str(p).replace(/\\/g, '/');
  if (!s) return 'not_configured';
  // strip anything that looks like an absolute machine path; keep last 2 segments
  const parts = s.split('/').filter(Boolean);
  if (parts.length <= 2) return parts.join('/');
  return parts.slice(-2).join('/');
}

function maskMessage(message) {
  let s = str(message);
  if (!s) return '';
  s = s.replace(/[+]?\d[\d\s().-]{8,}\d/g, (m) => maskPhone(m));
  s = s.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, (m) => maskEmail(m));
  if (s.length > 160) s = s.slice(0, 157) + '...';
  return s;
}

function safeText(value) {
  let s = str(value).replace(/[\u0000-\u001f\u007f]/g, ' ');
  if (s.length > 200) s = s.slice(0, 197) + '...';
  return s;
}

// Convert an env map into a presence-only map. Values are NEVER returned.
function redactEnvMap(env) {
  const out = {};
  const src = env || {};
  Object.keys(src).forEach((k) => { out[k] = src[k] ? 'configured' : 'not_configured'; });
  return out;
}

function redactLog(record) {
  const r = record || {};
  return {
    ts: safeText(r.ts || r.time || r.timestamp || ''),
    level: safeText(r.level || r.severity || 'info'),
    message: maskMessage(r.message || r.msg || ''),
    rawExposed: false,
  };
}

function redactRoute(route) {
  const r = route || {};
  return {
    method: safeText(r.method || 'GET').toUpperCase().slice(0, 7),
    path: safeText(r.path || r.route || ''),
  };
}

function redactModule(mod) {
  const m = mod || {};
  return {
    name: safeText(m.name || 'unknown'),
    path: maskPath(m.path || ''),
    category: safeText(m.category || 'uncategorized'),
    exists: m.exists === true,
    status: safeText(m.status || (m.exists ? 'available_preview' : 'missing_preview')),
    warnings: Array.isArray(m.warnings) ? m.warnings.map(safeText) : [],
  };
}

function redactError(error) {
  const e = error || {};
  const msg = typeof e === 'string' ? e : (e.message || 'error');
  return { message: safeText(String(msg).split('\n')[0]), hasStack: false, stackExposed: false };
}

// Last-line defence: detect obvious leaks before a response is sent.
function hasLeak(obj) {
  let s;
  try { s = JSON.stringify(obj); } catch (_) { return false; }
  if (!s) return false;
  if (/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(s)) return true;     // raw private key
  if (/\bsk-[A-Za-z0-9]{20,}\b/.test(s)) return true;                 // openai-style secret
  if (/"stack"\s*:/.test(s)) return true;                            // stack trace field
  if (/\\n\s+at\s+[^\s]+\s*\(?[^)]*:\d+:\d+\)?/.test(s)) return true; // serialized stack frame
  return false;
}

// Redact a webhook payload: keep only shape/keys, mask any value that looks sensitive.
function redactWebhookPayload(payload) {
  const p = payload || {};
  const keysPreview = (p && typeof p === 'object') ? Object.keys(p).slice(0, 30).map(safeText) : [];
  return { keysPreview, valuesExposed: false, sample: 'redacted_preview', piiMasked: true };
}

// Redact a package script command: hide tokens/paths, flag dangerous patterns.
function redactPackageScript(script) {
  let s = safeText(script);
  s = s.replace(/(--token=|--key=|Bearer\s+)\S+/gi, '$1****');
  const dangerous = /rm -rf|reset --hard|push -f|--force|deploy:prod|prod deploy/i.test(String(script || ''));
  return { commandMasked: s, dangerous: dangerous };
}

module.exports = {
  maskPhone, maskEmail, maskName, maskToken, maskSecret, maskRef, maskPath, maskMessage,
  safeText, redactEnvMap, redactLog, redactRoute, redactModule, redactError, hasLeak,
  redactWebhookPayload, redactPackageScript,
};
