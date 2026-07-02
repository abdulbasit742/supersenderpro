'use strict';
/** lib/embeddedSignup/util.js - shared helpers for embedded signup. */
const nowISO = () => new Date().toISOString();
const id = (prefix) => prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/** Redact a token to a safe fingerprint for storage echo / logs (never store/return raw). */
function redactToken(t) {
  const s = String(t || '');
  if (!s) return '';
  return s.slice(0, 4) + '\u2026' + s.slice(-4) + ' (len ' + s.length + ')';
}

/** Strip any secret-ish fields from an object before it leaves the server. */
function redactConnection(conn) {
  if (!conn) return conn;
  const c = Object.assign({}, conn);
  if (c.accessToken) { c.accessTokenFingerprint = redactToken(c.accessToken); delete c.accessToken; }
  delete c.appSecret;
  return c;
}

module.exports = { nowISO, id, redactToken, redactConnection };
