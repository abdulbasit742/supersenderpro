  'use strict';
  /**
      * auth-status.js — drop-in widget for any dashboard page. Renders a small badge
      * with admin-auth state and a link to /admin-login.html. Include with:
      *   <script src="/js/auth-status.js" data-mount="#auth-status"></script>
      * Safe: read-only, never shows tokens, degrades silently if API is down.
      */

(function () {
   async function run() {
     const sel = (document.currentScript && document.currentScript.getAttribute('data-mount')) || '#auth-status';
   const el = document.querySelector(sel) || (function () { const d = document.createElement('div'); d.id = 'auth-status'; document.body.appendChild(d); return d; })();
    let s;
    try { s = await (await fetch('/api/admin-auth/status', { credentials: 'same-origin' })).json(); } catch (e) { return;
}
    if (!s || s.ok === false) return;
    const state = s.authenticated ? 'Signed in' : (s.requireLogin ? 'Login required' : 'Demo (open)');
    const color = s.authenticated ? '#3fb950' : (s.requireLogin ? '#f85149' : '#d29922');
   el.innerHTML = '<a href="/admin-login.html" style="text-decoration:none;font:12px system-ui;color:' + color +';border:1px solid ' + color + ';padding:3px 10px;border-radius:999px;">● ' + state + '</a>';
   }
   if (document.readyState !== 'loading') run(); else document.addEventListener('DOMContentLoaded', run);
})();
