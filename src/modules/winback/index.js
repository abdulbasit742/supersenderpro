// src/modules/winback/index.js
// Express routes + /winback dashboard + scheduler hook for the Win-Back Engine.


'use strict';

const core = require('./winback');


let _timer = null;

function register(app, deps = {}, opts = {}) {
 app.get('/api/winback/status', (_req, res) => res.json({ ok: true, ...core.getStats() }));


   app.post('/api/winback/run', async (_req, res) => {
     try { res.json({ ok: true, result: await core.runOnce(deps) }); }
     catch (err) { res.status(500).json({ ok: false, error: String(err && err.message ? err.message : err) }); }
   });


   app.post('/api/winback/recovered', (req, res) => {
     const id = req.body && (req.body.orderId || req.body.id);
     if (!id) return res.status(400).json({ ok: false, error: 'orderId required' });
     res.json({ ok: true, ...core.markRecovered(id) });
   });


   app.post('/api/winback/opt-out', (req, res) => {
     const n = req.body && (req.body.customerNumber || req.body.number);
     if (!n) return res.status(400).json({ ok: false, error: 'customerNumber required' });
     res.json({ ok: true, ...core.optOut(n) });
   });


   app.get('/api/winback/preview', async (_req, res) => {
     try {
         const store = core._internal.readStore();
         const orders = (await deps.getExpiredOrders()) || [];
       res.json({ ok: true, due: core.computeDue(orders, store) });
     } catch (err) { res.status(500).json({ ok: false, error: String(err && err.message ? err.message : err) }); }
   });

   app.get('/winback', (_req, res) => res.send(renderDashboard(core.getStats())));

   startScheduler(deps, opts);
   return { core };
}

function startScheduler(deps, opts = {}) {
 if (_timer) clearInterval(_timer);
   const tickMs = opts.tickMs || Number(process.env.WINBACK_TICK_MS || 30 * 60 * 1000); // every 30 min
   _timer = setInterval(() => {
     core.runOnce(deps).catch((err) => console.error('[winback] tick error:', err));
   }, tickMs);


    if (_timer.unref) _timer.unref();
    setTimeout(() => core.runOnce(deps).catch(() => {}), 8000);
}


function stopScheduler() { if (_timer) clearInterval(_timer); _timer = null; }

function renderDashboard(s) {
  const rows = Object.entries(s.byStage || {}).map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('') || '<tr>\n<td colspan="2">No sends yet</td></tr>';
  return `<!doctype html><html><head><meta charset="utf-8"/><title>Win-Back</title>
<style>
    body{background:#0f1115;color:#e6e6e6;font:14px/1.5 system-ui,sans-serif;margin:0;padding:32px}
    h1{font-size:20px;margin:0 0 4px}.muted{color:#8a8f98;margin-bottom:24px}
    .cards{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:24px}
    .card{background:#181b22;border:1px solid #242833;border-radius:12px;padding:16px 20px;min-width:130px}
  .card .n{font-size:28px;font-weight:700}.card .l{color:#8a8f98;font-size:12px;text-transform:uppercase;letter-spacing:.04em}
    table{border-collapse:collapse;width:100%;max-width:420px;background:#181b22;border-radius:12px;overflow:hidden}
    th,td{text-align:left;padding:10px 14px;border-bottom:1px solid #242833}th{color:#8a8f98}
    .pill{display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:600}
    .dry{background:#3a2e12;color:#f0c674}.live{background:#10331f;color:#5fd38a}
</style></head><body>
  <h1>Win-Back Engine</h1>
  <div class="muted">Mode: <span class="pill ${s.config.dryRun ? 'dry' : 'live'}">${s.config.dryRun ? 'DRY-RUN' : 'LIVE'}
</span> &middot; recovery rate ${(s.recoveryRate * 100).toFixed(0)}%</div>
    <div class="cards">
      <div class="card"><div class="n">${s.totalSent}</div><div class="l">Sent</div></div>
     <div class="card"><div class="n">${s.recovered}</div><div class="l">Recovered</div></div>
     <div class="card"><div class="n">${s.dormant}</div><div class="l">Dormant</div></div>
      <div class="card"><div class="n">${s.optOuts}</div><div class="l">Opt-outs</div></div>
    </div>
  <table><thead><tr><th>Stage</th><th>Sent</th></tr></thead><tbody>${rows}</tbody></table>
</body></html>`;
}

module.exports = { register, startScheduler, stopScheduler, core, renderDashboard };
