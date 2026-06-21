// src/modules/pause/index.js
// Express routes + /pause dashboard + scheduler hook for Subscription Pause/Resume.


'use strict';

const core = require('./pause');


let _timer = null;

function register(app, deps = {}, opts = {}) {
 app.post('/api/pause/pause', (req, res) => {
    const b = req.body || {};
    if (!b.customerNumber) return res.status(400).json({ ok: false, error: 'customerNumber required' });
     res.json(core.pause(b.customerNumber, { expiresAt: b.expiresAt, days: b.days, firstSeenAt: b.firstSeenAt }));
   });

   app.post('/api/pause/resume', (req, res) => {
    const b = req.body || {};
    if (!b.customerNumber) return res.status(400).json({ ok: false, error: 'customerNumber required' });
     res.json(core.resume(b.customerNumber));
   });

   app.get('/api/pause/state/:number', (req, res) => res.json({ ok: true, ...core.stateOf(req.params.number) }));
   app.get('/api/pause/muted/:number', (req, res) => res.json({ ok: true, muted: core.isMuted(req.params.number) }));
   app.post('/api/pause/run', async (_req, res) => res.json({ ok: true, result: await core.runOnce(deps) }));
   app.get('/api/pause/status', (_req, res) => res.json({ ok: true, ...core.getStats() }));

   app.get('/pause', (_req, res) => res.send(renderDashboard(core.getStats())));


   startScheduler(deps, opts);
   return { core };
}

function startScheduler(deps, opts = {}) {
 if (_timer) clearInterval(_timer);
   const tickMs = opts.tickMs || Number(process.env.PAUSE_TICK_MS || 60 * 60 * 1000); // hourly
   _timer = setInterval(() => core.runOnce(deps).catch((e) => console.error('[pause] tick error:', e)), tickMs);
   if (_timer.unref) _timer.unref();
   setTimeout(() => core.runOnce(deps).catch(() => {}), 10000);
}
function stopScheduler() { if (_timer) clearInterval(_timer); _timer = null; }

function renderDashboard(s) {
   const mask = (num) => String(num).replace(/.(?=.{4})/g, '•');
   const fmtDate = (ms) => ms ? new Date(ms).toISOString().slice(0, 10) : '-';
 const rows = s.pausedList.map((p) => `<tr><td>${mask(p.customerNumber)}</td><td>${fmtDate(p.resumeAt)}</td>
<td>${p.bankedDays} days</td></tr>`).join('') || '<tr><td colspan="3">Nobody paused right now</td></tr>';
 return `<!doctype html><html><head><meta charset="utf-8"/><title>Pause/Resume</title>
<style>


    body{background:#0f1115;color:#e6e6e6;font:14px/1.5 system-ui,sans-serif;margin:0;padding:32px}
    h1{font-size:20px;margin:0 0 4px}.muted{color:#8a8f98;margin-bottom:24px}
    .cards{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:24px}
    .card{background:#181b22;border:1px solid #242833;border-radius:12px;padding:16px 20px;min-width:130px}
    .card .n{font-size:28px;font-weight:700}.card .l{color:#8a8f98;font-size:12px;text-transform:uppercase;letter-spacing:.04em}
  table{border-collapse:collapse;width:100%;max-width:520px;background:#181b22;border-radius:12px;overflow:hidden}
    th,td{text-align:left;padding:10px 14px;border-bottom:1px solid #242833}th{color:#8a8f98}
    .pill{display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:600}
  .dry{background:#3a2e12;color:#f0c674}.live{background:#10331f;color:#5fd38a}
</style></head><body>
    <h1>Subscription Pause/Resume</h1>
    <div class="muted">Mode: <span class="pill ${s.config.dryRun ? 'dry' : 'live'}">${s.config.dryRun ? 'DRY-RUN' : 'LIVE'}
</span> &middot; max ${s.config.maxDays}d &middot; ${s.config.maxPerYear}/yr</div>
  <div class="cards">
     <div class="card"><div class="n">${s.paused}</div><div class="l">Paused now</div></div>
     <div class="card"><div class="n">${s.active}</div><div class="l">Active</div></div>
     <div class="card"><div class="n">${s.pausesAllTime}</div><div class="l">Pauses (all time)</div></div>
     <div class="card"><div class="n">${s.resumesAllTime}</div><div class="l">Resumes</div></div>
    </div>
    <table><thead><tr><th>Customer</th><th>Auto-resume on</th><th>Banked</th></tr></thead><tbody>${rows}</tbody></table>
</body></html>`;
}


module.exports = { register, startScheduler, stopScheduler, core, renderDashboard };
