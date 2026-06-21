// src/modules/backup/index.js
// Express routes + /backup dashboard + scheduler hook for Backup & Restore.


'use strict';

const core = require('./backup');


let _timer = null;

function register(app, opts = {}) {
 app.post('/api/backup/now', (_req, res) => {
     try { res.json({ ok: true, ...core.backupNow() }); }
     catch (err) { res.status(500).json({ ok: false, error: String(err && err.message ? err.message : err) }); }
   });

   app.get('/api/backup/list', (_req, res) => res.json({ ok: true, backups: core.listBackups() }));


   app.post('/api/backup/verify', (req, res) => {
     const id = req.body && req.body.id;
     if (!id) return res.status(400).json({ ok: false, error: 'id required' });
     res.json({ ok: true, ...core.verify(id) });
   });


   // Restore requires an explicit confirm flag so it can't fire by accident.
   app.post('/api/backup/restore', (req, res) => {
     const b = req.body || {};
     if (!b.id) return res.status(400).json({ ok: false, error: 'id required' });
   if (b.confirm !== true) return res.status(400).json({ ok: false, error: 'set confirm:true to restore (this overwrites\nlive data)' });
     res.json(core.restore(b.id));
   });

   app.get('/api/backup/status', (_req, res) => res.json({ ok: true, ...core.getStats() }));

   app.get('/backup', (_req, res) => res.send(renderDashboard(core.getStats())));

   startScheduler(opts);
   return { core };
}

function startScheduler(opts = {}) {
   if (_timer) clearInterval(_timer);
   if (!core.CONFIG.enabled) return;
   const intervalMs = opts.intervalMs || core.CONFIG.intervalHours * 60 * 60 * 1000;
   _timer = setInterval(() => {
     try { core.backupNow(); } catch (e) { console.error('[backup] scheduled backup error:', e && e.message); }
   }, intervalMs);
   if (_timer.unref) _timer.unref();
   // First backup shortly after boot so there's always a recent restore point.


    setTimeout(() => { try { core.backupNow(); } catch (_) {} }, 15000);
}
function stopScheduler() { if (_timer) clearInterval(_timer); _timer = null; }


function fmtBytes(n) {
    if (n == null) return '-';
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
function fmtDate(ms) { return ms ? new Date(ms).toISOString().slice(0, 16).replace('T', ' ') : '-'; }

function renderDashboard(s) {
    const rows = s.backups.map((b) => `<tr>
      <td><code>${b.id}</code></td>
     <td>${fmtDate(b.createdAt)}</td>
     <td>${b.files != null ? b.files : '-'}</td>

                             ✅ ⚠️
     <td>${fmtBytes(b.totalBytes)}</td>
     <td>${b.hasManifest ? ' ' : '     no manifest'}</td>
    </tr>`).join('') || '<tr><td colspan="5">No backups yet</td></tr>';
    return `<!doctype html><html><head><meta charset="utf-8"/><title>Backup</title>
<style>
  body{background:#0f1115;color:#e6e6e6;font:14px/1.5 system-ui,sans-serif;margin:0;padding:32px}
    h1{font-size:20px;margin:0 0 4px}.muted{color:#8a8f98;margin-bottom:24px}
    .cards{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:24px}
    .card{background:#181b22;border:1px solid #242833;border-radius:12px;padding:16px 20px;min-width:140px}
    .card .n{font-size:24px;font-weight:700}.card .l{color:#8a8f98;font-size:12px;text-transform:uppercase;letter-
spacing:.04em}
  .card .s{font-size:12px;color:#8a8f98;margin-top:4px}
    table{border-collapse:collapse;width:100%;max-width:760px;background:#181b22;border-radius:12px;overflow:hidden}
    th,td{text-align:left;padding:10px 14px;border-bottom:1px solid #242833}th{color:#8a8f98}
  code{color:#9ecbff;font-size:12px}
</style></head><body>
    <h1>Backup & Restore</h1>
    <div class="muted">Backing up <code>${s.config.dataDir}</code> &middot; keep last ${s.keep} &middot; every
${s.intervalHours}h</div>
  <div class="cards">
     <div class="card"><div class="n">${s.dataFiles}</div><div class="l">Data files</div></div>
     <div class="card"><div class="n">${s.backupCount}</div><div class="l">Backups</div></div>
    <div class="card"><div class="n">${s.latest ? fmtBytes(s.latest.totalBytes) : '-'}</div><div class="l">Latest
size</div><div class="s">${s.latest ? fmtDate(s.latest.createdAt) : 'none yet'}</div></div>
    </div>
    <table><thead><tr><th>Backup ID</th><th>Created</th><th>Files</th><th>Size</th><th>Integrity</th></tr></thead>
<tbody>${rows}</tbody></table>
</body></html>`;
}


module.exports = { register, startScheduler, stopScheduler, core, renderDashboard };
