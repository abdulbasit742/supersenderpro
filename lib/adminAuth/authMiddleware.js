  'use strict';
  /**
      * authMiddleware.js — attaches req.adminAuth = { authenticated, session } by
      * reading the signed session cookie. Never throws; never exposes the token.
      * Does NOT block on its own; blocking is the route guard's job. */ const { config } = require('./authConfig'); const sessionStore = require('./sessionStore'); function parseCookies(req) { const header = (req && req.headers && req.headers.cookie) || ''; const out = {}; header.split(';').forEach((p) => { const i = p.indexOf('='); if (i > -1) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());}); return out;} function attach() { return function (req, res, next) { const c = config(); let session = null; try { const cookies = parseCookies(req); const raw = cookies[c.cookieName]; if (raw && raw.indexOf('.') > -1) { const [token, sig] = raw.split('.'); session = sessionStore.get(token, sig);}} catch (e) { session = null; } req.adminAuth = { authenticated: !!session, session: session || null, config: { enabled: c.enabled, demoMode: c.demoMode, requireLogin: c.requireLogin } }; next();
      };
  }


  function setSessionCookie(res, token, sig) {
      const c = config();
      const parts = [
        c.cookieName + '=' + encodeURIComponent(token + '.' + sig),
        'Path=/',
        'SameSite=Lax',
        'Max-Age=' + Math.floor(sessionStore.TTL_MS / 1000),
      ];
      if (c.cookieHttpOnly) parts.push('HttpOnly');
      if (c.cookieSecure) parts.push('Secure');
      res.setHeader('Set-Cookie', parts.join('; '));
  }


  function clearSessionCookie(res) {
    const c = config();
      res.setHeader('Set-Cookie', c.cookieName + '=; Path=/; Max-Age=0; SameSite=Lax');
  }


  module.exports = { attach, parseCookies, setSessionCookie, clearSessionCookie };
