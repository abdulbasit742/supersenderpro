  'use strict';
  /**
   * redactor.js — never expose session tokens, hashes, or full PII in responses
      * or logs. Masks emails and strips token-like fields.
      */
  function maskEmail(email) {
    const s = String(email || '');
       const at = s.indexOf('@');
       if (at < 1) return s ? '***' : '';
       return s[0] + '***' + s.slice(at);
  }

  function safeSession(session) {
       if (!session) return null;
       return { email: maskEmail(session.email), role: session.role, expiresAt: session.expiresAt };
  }


  function stripSecrets(obj) {
    try {
         return JSON.parse(JSON.stringify(obj), (k, v) => {
           if (/token|sig|secret|hash|password|cookie/i.test(k)) return '[redacted]';
           return v;
         });
       } catch (e) { return {}; }
  }

  module.exports = { maskEmail, safeSession, stripSecrets };
