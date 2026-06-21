// src/modules/renewals/index.js
// Express routes + /renewals dashboard + scheduler hook for the Renewal Engine.


'use strict';

const core = require('./renewals');


let _timer = null;

/**
* Wire the engine into your Express app.
*
* @param {import('express').Express} app
* @param {Object} deps
* @param {Function} deps.getActiveOrders async () => Order[]
* @param {Function} [deps.sendWhatsApp]     async ({ to, message }) => any    (required when not dry-run)
* @param {Object}   [opts]
* @param {number}     [opts.tickMs]         override the scheduler interval
*/
function register(app, deps = {}, opts = {}) {
 // --- API ---
 app.get('/api/renewals/status', (_req, res) => {
   res.json({ ok: true, ...core.getStats() });
 });

 app.post('/api/renewals/run', async (_req, res) => {
   try {
       const result = await core.runOnce(deps);
       res.json({ ok: true, result });
   } catch (err) {
     res.status(500).json({ ok: false, error: String(err && err.message ? err.message : err) });
   }
 });

 app.post('/api/renewals/opt-out', (req, res) => {
   const n = (req.body && (req.body.customerNumber || req.body.number)) || '';
   if (!n) return res.status(400).json({ ok: false, error: 'customerNumber required' });
   res.json({ ok: true, ...core.optOut(n) });
 });

 app.get('/api/renewals/preview', async (_req, res) => {
   try {
     const store = core._internal.readStore();
       const orders = (await deps.getActiveOrders()) || [];
       res.json({ ok: true, due: core.computeDueReminders(orders, store) });
   } catch (err) {
     res.status(500).json({ ok: false, error: String(err && err.message ? err.message : err) });
   }
 });


  // --- Dashboard ---
  app.get('/renewals', (_req, res) => {
    const s = core.getStats();
    res.send(renderDashboard(s));
  });


  // --- Scheduler ---
  startScheduler(deps, opts);
  return { core };
}

function startScheduler(deps, opts = {}) {
  if (_timer) clearInterval(_timer);
  // Default: every 15 minutes. RENEWALS_TICK_CRON is documented for cron setups;
  // here we use a simple interval so the module stays dependency-free.
  const tickMs = opts.tickMs || Number(process.env.RENEWALS_TICK_MS || 15 * 60 * 1000);
  _timer = setInterval(() => {
    core.runOnce(deps).catch((err) => console.error('[renewals] tick error:', err));
  }, tickMs);
  if (_timer.unref) _timer.unref();
  // Fire one tick shortly after boot so you don't wait a full interval.
  setTimeout(() => core.runOnce(deps).catch(() => {}), 5000);
}

function stopScheduler() {
if (_timer) clearInterval(_timer);
  _timer = null;
}


function renderDashboard(s) {
  const rows = Object.entries(s.byKind || {})
    .map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`)
    .join('') || '<tr><td colspan="2">No sends yet</td></tr>';
  return `<!doctype html><html><head><meta charset="utf-8"/>
<title>Renewals</title>
<style>
  body{background:#0f1115;color:#e6e6e6;font:14px/1.5 system-ui,sans-serif;margin:0;padding:32px}
  h1{font-size:20px;margin:0 0 4px}
  .muted{color:#8a8f98;margin-bottom:24px}
  .cards{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:24px}
  .card{background:#181b22;border:1px solid #242833;border-radius:12px;padding:16px 20px;min-width:140px}
  .card .n{font-size:28px;font-weight:700}
  .card .l{color:#8a8f98;font-size:12px;text-transform:uppercase;letter-spacing:.04em}
  table{border-collapse:collapse;width:100%;max-width:420px;background:#181b22;border-radius:12px;overflow:hidden}
  th,td{text-align:left;padding:10px 14px;border-bottom:1px solid #242833}
  th{color:#8a8f98;font-weight:600}
  .pill{display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:600}
  .dry{background:#3a2e12;color:#f0c674}
.live{background:#10331f;color:#5fd38a}
</style></head><body>
  <h1>Renewal & Follow-Up Engine</h1>
  <div class="muted">Mode: <span class="pill ${s.config.dryRun ? 'dry' : 'live'}">${s.config.dryRun ? 'DRY-RUN' : 'LIVE'}
</span></div>
<div class="cards">
    <div class="card"><div class="n">${s.sent}</div><div class="l">Sent</div></div>
    <div class="card"><div class="n">${s.totalReminders}</div><div class="l">Total</div></div>


     <div class="card"><div class="n">${s.optOuts}</div><div class="l">Opt-outs</div></div>
    </div>
    <table><thead><tr><th>Kind</th><th>Sent</th></tr></thead><tbody>${rows}</tbody></table>
</body></html>`;
}

module.exports = { register, startScheduler, stopScheduler, core, renderDashboard };
