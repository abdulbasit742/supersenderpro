'use strict';


/**
    * Mock Gateway — input sanitizer. Redacts a payload + reports findings. Never
    * stores or returns raw sensitive values.
    */


const PII = require('./mockPIIPatterns');
const SECRET = require('./mockSecretPatterns');
const redactor = require('./mockRedactor');

function findings(text) {
  const s = String(text || '');
     const out = [];
     if ((s.match(PII.EMAIL) || []).length) out.push({ type: 'email', count: (s.match(PII.EMAIL) || []).length });
     const phones = (s.match(PII.PHONE) || []).filter(function (m) { return /\d{7,}/.test(m.replace(/[^0-9]/g, '')); });
     if (phones.length) out.push({ type: 'phone', count: phones.length });
  if ((s.match(SECRET.BEARER) || []).length) out.push({ type: 'bearer_token', count: (s.match(SECRET.BEARER) ||
[]).length });
     if ((s.match(SECRET.OPENAI) || []).length) out.push({ type: 'api_key', count: (s.match(SECRET.OPENAI) || []).length });
     if ((s.match(SECRET.API_KEY) || []).length) out.push({ type: 'secret_assignment', count: (s.match(SECRET.API_KEY) ||
[]).length });

   if ((s.match(SECRET.JWT) || []).length) out.push({ type: 'jwt', count: (s.match(SECRET.JWT) || []).length });
   return out;
}

function sanitize(input) {
   const asText = typeof input === 'string' ? input : JSON.stringify(input || {});
   return {
     ok: true,
     findings: findings(asText),
     redacted: redactor.redact(input),
     note: 'Raw values never returned. Redacted preview only.',
   };
}

module.exports = { sanitize, findings };
