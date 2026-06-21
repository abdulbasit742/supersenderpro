// src/modules/briefing/index.js
// Express routes + /briefing dashboard + daily scheduler for the Founder Briefing.
'use strict';

const core = require('./briefing');

let _timer = null;

function register(app, deps = {}, opts = {}) {
  app.post('/api/briefing/build', async (_req, res) => {
    try { res.json({ ok: true, ...(await core.build(deps)) }); }
    catch (err) { res.status(500).json({ ok: false, error: String(err && err.message ? err.message : err) }); }
  });

  app.post('/api/briefing/send', async (_req, res) => {
    try { res.json({ ok: true, ...(await core.sendDaily(deps, { force: true })) }); }
    catch (err) { res.status(500).json({ ok: false, error: String(err && err.message ? err.message : err) }); }
  });

  app.get('/api/briefing/status', (_req, res) => res.json({ ok: true, ...core.getStats() }));
  app.get('/briefing', (_req, res) => res.send(renderDashboard(core.getStats())));
  startScheduler(deps, opts);
  return { core };
}

// Check hourly; send once when we hit the configured local hour.
function startScheduler(deps, opts = {}) {
  if (_timer) clearInterval(_timer);
  const tickMs = opts.tickMs || 60 * 60 * 1000;
  _timer = setInterval(() => {
    if (new Date().getHours() === core.CONFIG.sendHour) {
      core.sendDaily(deps).catch((e) => console.error('[briefing] send error:', e));
    }
  }, tickMs);
  if (_timer.unref) _timer.unref();
}

function stopScheduler() { if (_timer) clearInterval(_timer); _timer = null; }

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

function renderDashboard(s) {
  const icon = { critical: '🔴', warn: '🟡', info: '🔵' };
  const flagRows = (s.lastFlags || []).map((f) => `<li>${icon[f.level] || ''} ${escapeHtml(f.text)}</li>`).join('') || '<li>No flags in last briefing</li>';
  const preview = s.lastText ? escapeHtml(s.lastText) : 'No briefing built yet. POST /api/briefing/build';
  return `<!doctype html><html><head><meta charset="utf-8"/><title>Briefing</title>
<style>
  body{background:#0f1115;color:#e6e6e6;font:14px/1.5 system-ui,sans-serif;margin:0;padding:32px}
  h1{font-size:20px;margin:0 0 4px}.muted{color:#8a8f98;margin-bottom:24px}
  h2{font-size:13px;color:#8a8f98;text-transform:uppercase;letter-spacing:.04em;margin:24px 0 8px}
  .cards{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:8px}
  .card{background:#181b22;border:1px solid #242833;border-radius:12px;padding:16px 20px;min-width:150px}
  .card .n{font-size:24px;font-weight:700}.card .l{color:#8a8f98;font-size:12px;text-transform:uppercase;letter-spacing:.04em}
  ul{list-style:none;padding:0;max-width:520px}
  li{background:#181b22;border:1px solid #242833;border-radius:8px;padding:8px 12px;margin-bottom:6px}
  pre{background:#181b22;border:1px solid #242833;border-radius:12px;padding:18px;max-width:560px;white-space:pre-wrap;font:13px/1.6 ui-monospace,monospace;color:#cfd3da}
  .pill{display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:600}
  .dry{background:#3a2e12;color:#f0c674}.live{background:#10331f;color:#5fd38a}
</style></head><body>
  <h1>Daily Founder Briefing</h1>
  <div class="muted">Mode: <span class="pill ${s.config.dryRun ? 'dry' : 'live'}">${s.config.dryRun ? 'DRY-RUN' : 'LIVE'}</span> &middot; sends at ${s.config.sendHour}:00 &middot; last sent: ${s.lastSentDay || 'never'}</div>
  <div class="cards">
    <div class="card"><div class="n">${s.briefingsBuilt}</div><div class="l">Briefings built</div></div>
    <div class="card"><div class="n">${(s.lastFlags || []).length}</div><div class="l">Flags last run</div></div>
  </div>
  <h2>Last flags</h2><ul>${flagRows}</ul>
  <h2>Last digest preview</h2>
  <pre>${preview}</pre>
</body></html>`;
}

module.exports = { register, startScheduler, stopScheduler, core, renderDashboard };
