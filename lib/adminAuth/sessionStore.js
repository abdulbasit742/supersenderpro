  'use strict';
  /**
   * sessionStore.js — minimal in-memory signed-session store. No external deps,
      * no DB. Tokens are opaque random ids; the session payload never includes the
      * password or hash. Suitable for single-node local/demo; swap for Redis later.
   */
  const crypto = require('crypto');
  const { config } = require('./authConfig');

  const SESSIONS = new Map(); // token -> { email, createdAt, expiresAt, role }
  const TTL_MS = 1000 * 60 * 60 * 8; // 8h


  let ephemeralSecret = null;
  function secret() {
    const s = config().sessionSecret;
       if (s) return s;
       if (!ephemeralSecret) ephemeralSecret = crypto.randomBytes(32).toString('hex');
       return ephemeralSecret;
  }

  function sign(token) {
       return crypto.createHmac('sha256', secret()).update(token).digest('hex');
  }

  function create(email, role) {
       const token = crypto.randomBytes(24).toString('hex');
       const now = Date.now();
       SESSIONS.set(token, { email, role: role || 'admin', createdAt: now, expiresAt: now + TTL_MS });
       return { token, sig: sign(token) };
  }

  function get(token, sig) {
    if (!token || !sig) return null;
       let valid = false;
       try {
        const a = Buffer.from(sig);
        const b = Buffer.from(sign(token));
         valid = a.length === b.length && crypto.timingSafeEqual(a, b);
       } catch (e) { valid = false; }
       if (!valid) return null;
       const s = SESSIONS.get(token);
       if (!s) return null;
       if (Date.now() > s.expiresAt) { SESSIONS.delete(token); return null; }
       return s;
  }


  function destroy(token) { if (token) SESSIONS.delete(token); }
  function count() { return SESSIONS.size; }


  module.exports = { create, get, destroy, count, TTL_MS };
