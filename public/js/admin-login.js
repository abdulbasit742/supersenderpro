  'use strict';
  const API = '/api/admin-auth';
  const $ = (s) => document.querySelector(s);
  async function j(u, o) { try { const r = await fetch(u, Object.assign({ credentials: 'same-origin' }, o)); return await
  r.json(); } catch (e) { return { ok: false, error: 'unavailable' }; } }

  async function refresh() {
    const s = await j(API + '/status');
    if (!s || s.ok === false) { $('#al-status').textContent = 'Admin auth unavailable.'; return; }
    const bits = [
      'enabled: ' + s.enabled,
      'demo mode: ' + s.demoMode,
      'login required: ' + s.requireLogin,
      'authenticated: ' + s.authenticated,

       ];
       $('#al-status').textContent = bits.join(' · ');
       $('#al-logout').hidden = !s.authenticated;
       $('#al-form').hidden = s.authenticated;
       const warn = (s.warnings || []).concat(s.blockers || []);
    if (warn.length) { $('#al-warn').hidden = false; $('#al-warn').innerHTML = warn.map((w) => '<div>  ⚠ ' + esc(w) +
  '</div>').join(''); }
       else { $('#al-warn').hidden = true; }
  }

  $('#al-form').addEventListener('submit', async (e) => {
       e.preventDefault();
       const r = await j(API + '/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body:
  JSON.stringify({ email: $('#al-email').value, password: $('#al-password').value }) });
    if (r && r.ok) { $('#al-password').value = ''; await refresh(); }
    else { $('#al-warn').hidden = false; $('#al-warn').textContent = '   ⚠ ' + ((r && r.message) || 'Login failed.'); }
  });

  $('#al-logout').addEventListener('click', async () => { await j(API + '/logout', { method: 'POST' }); await refresh();
  });
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&', '<': '<', '>': '>' }[c])); }
  refresh();
