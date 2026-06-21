// src/modules/health/index.js
// Express routes (/health, /health/deep) + /health-monitor dashboard + self-monitor.


'use strict';

const core = require('./health');


let _timer = null;

function register(app, deps = {}, opts = {}) {
  // Liveness: cheap, for load balancers / uptime pingers. Always 200 if process is up.
    app.get('/health', (_req, res) => res.json(core.liveness()));

    // Deep: runs every probe. 200 if all up, 503 if any down (so monitors can alert).
    app.get('/health/deep', async (_req, res) => {
      const r = await core.runAll(deps);
      res.status(r.ok ? 200 : 503).json(r);
    });

    app.get('/api/health/status', (_req, res) => res.json({ ok: true, ...core.getStats() }));

    app.get('/health-monitor', (_req, res) => res.send(renderDashboard(core.getStats())));


    startMonitor(deps, opts);
    return { core };
}

function startMonitor(deps, opts = {}) {
  if (_timer) clearInterval(_timer);
    if (!core.CONFIG.enabled) return;
    const ms = opts.intervalMs || core.CONFIG.intervalSec * 1000;
    _timer = setInterval(() => core.runAll(deps).catch((e) => console.error('[health] monitor error:', e)), ms);
    if (_timer.unref) _timer.unref();
    setTimeout(() => core.runAll(deps).catch(() => {}), 8000); // first deep check shortly after boot
}
function stopMonitor() { if (_timer) clearInterval(_timer); _timer = null; }

function fmtUptime(sec) {
  const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60);
    return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
}
function ago(ms) { if (!ms) return 'never'; const s = Math.round((Date.now() - ms) / 1000); return s < 60 ? `${s}s ago` :
s < 3600 ? `${Math.round(s / 60)}m ago` : `${Math.round(s / 3600)}h ago`; }

function renderDashboard(s) {
    const dot = (st) => st === 'up' ? '#5fd38a' : '#f08a8a';
    const rows = s.checks.map((c) => `<tr>
      <td><span class="dot" style="background:${dot(c.status)}"></span>${c.name}</td>
      <td>${c.status}</td>


       <td>${c.detail || '-'}</td>
       <td>${ago(c.lastOkAt)}</td>
       <td>${ago(c.since)}</td>
   </tr>`).join('') || '<tr><td colspan="5">No probes registered</td></tr>';
   const transRows = s.recentTransitions.map((t) => `<tr>
       <td>${new Date(t.at).toISOString().slice(5, 16).replace('T', ' ')}</td>
       <td>${t.check}</td>
       <td>${t.from} → ${t.to === 'up' ? ' 🟢 up' : '🔴 down'}</td>
       <td>${t.detail || ''}</td>
   </tr>`).join('') || '<tr><td colspan="4">No transitions - stable</td></tr>';
   const statusColor = s.status === 'ok' ? '#5fd38a' : '#f0c674';
   return `<!doctype html><html><head><meta charset="utf-8"/><title>Health Monitor</title>
 <style>
   body{background:#0f1115;color:#e6e6e6;font:14px/1.5 system-ui,sans-serif;margin:0;padding:32px}
   h1{font-size:20px;margin:0 0 4px}.muted{color:#8a8f98;margin-bottom:24px}
   h2{font-size:13px;color:#8a8f98;text-transform:uppercase;letter-spacing:.04em;margin:24px 0 8px}
   .cards{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:8px}
   .card{background:#181b22;border:1px solid #242833;border-radius:12px;padding:16px 20px;min-width:130px}
   .card .n{font-size:24px;font-weight:700}.card .l{color:#8a8f98;font-size:12px;text-transform:uppercase;letter-
 spacing:.04em}
   table{border-collapse:collapse;width:100%;max-width:820px;background:#181b22;border-radius:12px;overflow:hidden}
   th,td{text-align:left;padding:9px 14px;border-bottom:1px solid #242833}th{color:#8a8f98}
   .dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:8px;vertical-align:middle}
   .pill{display:inline-block;padding:2px 12px;border-radius:999px;font-size:13px;font-weight:600}
 </style></head><body>
   <h1>Health & Uptime Monitor</h1>
   <div class="muted">Overall: <span class="pill"
 style="background:${statusColor}22;color:${statusColor}">${s.status.toUpperCase()}</span> &middot; up
 ${fmtUptime(s.uptimeSec)} &middot; ${s.restarts} restarts${s.config.dryRun ? ' &middot; alerts DRY-RUN' : ''}</div>
   <div class="cards">
     <div class="card"><div class="n">${s.probeCount}</div><div class="l">Probes</div></div>
       <div class="card"><div class="n">${s.down.length}</div><div class="l">Down now</div></div>
       <div class="card"><div class="n">${fmtUptime(s.uptimeSec)}</div><div class="l">Uptime</div></div>
     <div class="card"><div class="n">${s.restarts}</div><div class="l">Restarts</div></div>
   </div>
   <h2>Checks</h2>
   <table><thead><tr><th>Check</th><th>Status</th><th>Detail</th><th>Last OK</th><th>Since</th></tr></thead><tbody>${rows}
 </tbody></table>
   <h2>Recent transitions</h2>
   <table><thead><tr><th>When</th><th>Check</th><th>Change</th><th>Detail</th></tr></thead><tbody>${transRows}</tbody>
 </table>
 </body></html>`;
 }


 module.exports = { register, startMonitor, stopMonitor, core, renderDashboard };
