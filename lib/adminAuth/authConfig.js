  'use strict';
  /**
   * authConfig.js — reads admin-auth config from env placeholders only.
      * Never contains real credentials. require-login defaults FALSE so the existing
      * local demo does not break; can be flipped true later.
   */
  function bool(v, dflt) {
       if (v == null || v === '') return dflt;
       return String(v).toLowerCase() === 'true';
  }

  function config() {
    return {
         enabled: bool(process.env.ADMIN_AUTH_ENABLED, true),
         demoMode: bool(process.env.ADMIN_AUTH_DEMO_MODE, true),
         requireLogin: bool(process.env.ADMIN_AUTH_REQUIRE_LOGIN, false),
         sessionSecret: process.env.ADMIN_AUTH_SESSION_SECRET || '',
         adminEmail: process.env.ADMIN_AUTH_ADMIN_EMAIL || '',
         adminPasswordHash: process.env.ADMIN_AUTH_ADMIN_PASSWORD_HASH || '',
         cookieName: process.env.ADMIN_AUTH_COOKIE_NAME || 'supersender_admin',
         cookieSecure: bool(process.env.ADMIN_AUTH_COOKIE_SECURE, false),
         cookieHttpOnly: bool(process.env.ADMIN_AUTH_COOKIE_HTTP_ONLY, true),
       };
  }


  // Surface configuration problems WITHOUT leaking values.
  function issues() {
       const c = config();
       const warnings = [];
       const blockers = [];
       if (!c.sessionSecret) warnings.push('ADMIN_AUTH_SESSION_SECRET not set (using ephemeral in-memory secret; sessions reset on restart).');
    if (!c.adminPasswordHash) warnings.push('ADMIN_AUTH_ADMIN_PASSWORD_HASH not set (login disabled until configured).');
       // Hard rule: requiring login with no hash configured must NOT silently lock everyone out.
       if (c.requireLogin && !c.adminPasswordHash) {
      blockers.push('ADMIN_AUTH_REQUIRE_LOGIN=true but no ADMIN_AUTH_ADMIN_PASSWORD_HASH configured. Set a hash or keep require-login false.');
       }
       return { warnings, blockers };
  }

  module.exports = { config, issues, bool };
