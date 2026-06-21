 'use strict';
 /**
  * redactor.js — never print raw secrets / full PII. Produces redacted previews
     * only. Shared by manifest, copy-safety scan, and routes.
     */
 const PATTERNS = [
   { name: 'api_key', re: /\b(sk|pk|rk)_[A-Za-z0-9]{12,}\b/g },
      { name: 'bearer', re: /\bBearer\s+[A-Za-z0-9._-]{12,}\b/gi },
      { name: 'private_key', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
      { name: 'db_url_pw', re: /\b\w+:\/\/[^:@\s]+:[^@\s]+@[^\s]+/g },
      { name: 'jwt', re: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g },
      { name: 'email', re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
      { name: 'phone', re: /\b\+?\d[\d ().-]{8,}\d\b/g },
 ];

 function maskValue(v) {
   const s = String(v);
      if (s.length <= 4) return '****';
      return s.slice(0, 2) + '…' + s.slice(-2) + ' [redacted]';
 }


 function redactText(text) {
   let out = String(text == null ? '' : text);
      const found = [];
      for (const p of PATTERNS) {
     out = out.replace(p.re, (m) => { found.push({ type: p.name, preview: maskValue(m) }); return '[REDACTED:' + p.name +
 ']'; });
      }
      return { redacted: out, found };
 }


 function redactObject(obj) {
   try { return JSON.parse(redactText(JSON.stringify(obj)).redacted); }
      catch (e) { return {}; }
 }


 module.exports = { PATTERNS, maskValue, redactText, redactObject };
