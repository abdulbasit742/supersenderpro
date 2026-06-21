// lib/platformControl/redactor.js
  // Masking helpers. Pure functions, no I/O. Never returns raw secrets/PII/stacks.
  'use strict';


  function safeText(value) {
       if (value == null) return '';
       let s = String(value);
       if (s.length > 300) s = s.slice(0, 297) + '...';
       return s;
  }


  function maskPhone(phone) {
    const s = String(phone || '');
       const digits = s.replace(/[^\d]/g, '');
       if (digits.length < 4) return '***';
       const last4 = digits.slice(-4);
       const prefix = s.trim().startsWith('+') ? '+' : '';
       const cc = digits.slice(0, Math.min(2, Math.max(0, digits.length - 4)));
       const stars = Math.max(2, digits.length - 4 - cc.length);
       return prefix + cc + '*'.repeat(stars) + last4;
  }


  function maskEmail(email) {
       const s = String(email || '');
       const at = s.indexOf('@');
       if (at <= 0) return s ? '***' : '';
       const local = s.slice(0, at), domain = s.slice(at + 1);
       return local.slice(0, Math.min(2, local.length)) + '***@' + domain;
  }


  function maskName(name) {
       const s = String(name || '').trim();
       if (!s) return '';
       return s.split(/\s+/).map((p) => (p ? p[0] + '***' : '')).join(' ');
  }


  function maskToken(token) { return token ? 'token_****' : 'not_configured'; }
  function maskSecret(value) { return value ? 'secret_****' : 'not_configured'; }

function maskRef(ref) {
     const s = String(ref || '');
     if (!s) return '';
     if (s.length <= 4) return '****';
     return s.slice(0, 2) + '****' + s.slice(-2);
}


function maskPath(p) {
  let s = String(p || '');
     if (!s) return '';
     s = s.replace(/^[A-Za-z]:\\Users\\[^\\]+/i, '<home>');
     s = s.replace(/^\/home\/[^/]+/i, '<home>');
     s = s.replace(/^\/Users\/[^/]+/i, '<home>');
     if (/\.env|session|creds|auth_info|\.pem|\.key/i.test(s)) return '<redacted_path>';
     return s;
}


function maskMessage(message) {
  let s = String(message || '');
     s = s.replace(/\+?\d[\d\s\-()]{7,}\d/g, (m) => maskPhone(m));
     s = s.replace(/[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/g, (m) => maskEmail(m));
     if (s.length > 120) s = s.slice(0, 117) + '...';
     return s;
}


function redactEnvMap(env) {
  const out = {};
     const obj = env && typeof env === 'object' ? env : {};
     Object.keys(obj).forEach((k) => {
       const present = obj[k] != null && String(obj[k]).length > 0;
       out[k] = present ? 'configured' : 'not_configured';
     });
     return out;
}


function redactLog(record) {
  if (record == null) return {};
     if (typeof record === 'string') return { message: maskMessage(record) };
     const r = {};
     if (record.level) r.level = safeText(record.level);
     if (record.time || record.timestamp) r.time = safeText(record.time || record.timestamp);
     if (record.message || record.msg) r.message = maskMessage(record.message || record.msg);
     return r; // never include stack / raw meta
}


function redactRoute(route) {
  const r = route || {};
     return { method: safeText(r.method || 'GET').toUpperCase(), path: safeText(r.path || ''), file: maskPath(r.file || '')
};
}


function redactModule(mod) {
  const m = mod || {};
     return {
       name: safeText(m.name || ''), path: maskPath(m.path || ''), exists: !!m.exists,
       category: safeText(m.category || 'misc'), status: safeText(m.status || 'unknown'),
     };

 }

 function redactError(error) {
      if (!error) return { message: '', stackExposed: false };
      const msg = error.message ? error.message : String(error);
      return { message: maskMessage(msg), stackExposed: false };
 }


 function redactWebhookPayload(payload) {
      try {
        let s = typeof payload === 'string' ? payload : JSON.stringify(payload);
       s = s.replace(/\+?\d[\d\s\-()]{7,}\d/g, (m) => maskPhone(m));
       s = s.replace(/[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}/g, (m) => maskEmail(m));
       if (s.length > 200) s = s.slice(0, 197) + '...';
       return s;
      } catch (_) { return '<unserializable_payload>'; }
 }


 function redactPackageScript(script) {
      let s = String(script || '');
      s = s.replace(/(--?(?:token|key|secret|password|auth)[=\s])(\S+)/gi, '$1****');
      return safeText(s);
 }


 module.exports = {
      safeText, maskPhone, maskEmail, maskName, maskToken, maskSecret, maskRef, maskPath, maskMessage,
      redactEnvMap, redactLog, redactRoute, redactModule, redactError, redactWebhookPayload, redactPackageScript,
 };
