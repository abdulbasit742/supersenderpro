// src/modules/dropRecovery/index.js
// Express routes + /drop-recovery dashboard + scheduler hook.


'use strict';

const core = require('./dropRecovery');


let _timer = null;

function register(app, deps = {}, opts = {}) {
 app.post('/api/drop-recovery/open', (req, res) => {
     try { res.json({ ok: true, order: core.openOrder(req.body || {}) }); }
     catch (err) { res.status(400).json({ ok: false, error: String(err && err.message ? err.message : err) }); }
   });

   app.post('/api/drop-recovery/recovered', (req, res) => {
     const num = req.body && req.body.customerNumber;
     if (!num) return res.status(400).json({ ok: false, error: 'customerNumber required' });
     res.json({ ok: true, ...core.markRecovered(num) });
   });

   app.post('/api/drop-recovery/opt-out', (req, res) => {
     const num = req.body && req.body.customerNumber;
     if (!num) return res.status(400).json({ ok: false, error: 'customerNumber required' });
     res.json({ ok: true, ...core.optOut(num) });
   });

   app.post('/api/drop-recovery/run', async (_req, res) => {
     try { res.json({ ok: true, result: await core.runOnce(deps) }); }
     catch (err) { res.status(500).json({ ok: false, error: String(err && err.message ? err.message : err) }); }
   });

   app.get('/api/drop-recovery/status', (_req, res) => res.json({ ok: true, ...core.getStats() }));

   app.get('/drop-recovery', (_req, res) => res.send(renderDashboard(core.getStats())));

   startScheduler(deps, opts);
   return { core };
}

function startScheduler(deps, opts = {}) {
   if (_timer) clearInterval(_timer);
   // Tight loop (5 min) since the first nudge fires at 20 min.
   const tickMs = opts.tickMs || Number(process.env.DROP_RECOVERY_TICK_MS || 5 * 60 * 1000);
   _timer = setInterval(() => core.runOnce(deps).catch((e) => console.error('[dropRecovery] tick error:', e)), tickMs);
   if (_timer.unref) _timer.unref();
   setTimeout(() => core.runOnce(deps).catch(() => {}), 5000);
}
function stopScheduler() { if (_timer) clearInterval(_timer); _timer = null; }


function renderDashboard(s) {
  const color = (st) => ({ open: '#f0c674', recovered: '#5fd38a', abandoned: '#f08a8a' }[st] || '#8a8f98');
  const mask = (num) => String(num).replace(/.(?=.{4})/g, '•');
  const rows = s.recent.map((o) => {
    const col = color(o.status);
    return `<tr><td>${o.id}</td><td>${mask(o.customerNumber)}</td><td>${o.productName}</td><td><span class="pill"
style="background:${col}22;color:${col}">${o.status}</span></td><td>${o.stagesSent.length}</td></tr>`;
  }).join('') || '<tr><td colspan="5">No orders tracked yet</td></tr>';
  return `<!doctype html><html><head><meta charset="utf-8"/><title>Drop Recovery</title>
<style>
  body{background:#0f1115;color:#e6e6e6;font:14px/1.5 system-ui,sans-serif;margin:0;padding:32px}
  h1{font-size:20px;margin:0 0 4px}.muted{color:#8a8f98;margin-bottom:24px}
  .cards{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:24px}
  .card{background:#181b22;border:1px solid #242833;border-radius:12px;padding:16px 20px;min-width:130px}
  .card .n{font-size:28px;font-weight:700}.card .l{color:#8a8f98;font-size:12px;text-transform:uppercase;letter-spacing:.04em}
  table{border-collapse:collapse;width:100%;max-width:720px;background:#181b22;border-radius:12px;overflow:hidden}
  th,td{text-align:left;padding:10px 14px;border-bottom:1px solid #242833}th{color:#8a8f98}
  .pill{display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:600}
  .dry{background:#3a2e12;color:#f0c674}.live{background:#10331f;color:#5fd38a}
</style></head><body>
  <h1>Dropped-Order Recovery</h1>
  <div class="muted">Mode: <span class="pill ${s.config.dryRun ? 'dry' : 'live'}">${s.config.dryRun ? 'DRY-RUN' : 'LIVE'}
</span> &middot; recovery rate ${(s.recoveryRate * 100).toFixed(0)}%</div>
  <div class="cards">
    <div class="card"><div class="n">${s.open}</div><div class="l">Open</div></div>
    <div class="card"><div class="n">${s.recovered}</div><div class="l">Recovered</div></div>
    <div class="card"><div class="n">${s.abandoned}</div><div class="l">Abandoned</div></div>
    <div class="card"><div class="n">${s.totalOrders}</div><div class="l">Total</div></div>
  </div>
  <table><thead><tr><th>Order</th><th>Customer</th><th>Product</th><th>Status</th><th>Nudges</th></tr></thead>
<tbody>${rows}</tbody></table>
</body></html>`;
}

module.exports = { register, startScheduler, stopScheduler, core, renderDashboard };
