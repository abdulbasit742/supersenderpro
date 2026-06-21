// src/modules/currency/index.js
// Express routes + /currency dashboard + optional auto-refresh scheduler.


'use strict';

const core = require('./currency');


let _timer = null;

function register(app, deps = {}) {
 app.post('/api/currency/rate', (req, res) => {
     const b = req.body || {};
     try { res.json({ ok: true, ...core.setRate(b.code, b.perBase) }); }
     catch (err) { res.status(400).json({ ok: false, error: String(err && err.message ? err.message : err) }); }
   });

   app.get('/api/currency/convert', (req, res) => {
     const amount = Number(req.query.amount);
     const to = req.query.to;
     if (isNaN(amount) || !to) return res.status(400).json({ ok: false, error: 'amount and to required' });
     res.json(core.convert(amount, to));
   });


   app.get('/api/currency/to-base', (req, res) => {
     const amount = Number(req.query.amount);
     const from = req.query.from;
     if (isNaN(amount) || !from) return res.status(400).json({ ok: false, error: 'amount and from required' });
     res.json(core.convertToBase(amount, from));
   });

   app.post('/api/currency/snapshot', (req, res) => {
     const b = req.body || {};
     try { res.json({ ok: true, snapshot: core.snapshotForOrder(b.order || {}, b.to) }); }
     catch (err) { res.status(400).json({ ok: false, error: String(err && err.message ? err.message : err) }); }
   });

   app.post('/api/currency/refresh', async (_req, res) => {
     try { res.json(await core.refresh(deps.fetchRates)); }
     catch (err) { res.status(500).json({ ok: false, error: String(err && err.message ? err.message : err) }); }
   });


   app.get('/api/currency/status', (_req, res) => res.json({ ok: true, ...core.getStats() }));

   app.get('/currency', (_req, res) => res.send(renderDashboard(core.getStats())));

   // Optional auto-refresh when a fetch hook is supplied.
   if (typeof deps.fetchRates === 'function') startAutoRefresh(deps.fetchRates);
   return { core };
}


function startAutoRefresh(fetchFn) {
  if (_timer) clearInterval(_timer);
    const hrs = Number(process.env.CURRENCY_AUTO_REFRESH_HOURS || 12);
    _timer = setInterval(() => core.refresh(fetchFn).catch((e) => console.error('[currency] refresh error:', e)), hrs * 60
* 60 * 1000);
  if (_timer.unref) _timer.unref();
    setTimeout(() => core.refresh(fetchFn).catch(() => {}), 10000);
}
function stopAutoRefresh() { if (_timer) clearInterval(_timer); _timer = null; }

function renderDashboard(s) {
  const rows = s.rates.map((r) => `<tr><td>${r.code}</td><td>${r.perBase}</td><td>${r.example}</td></tr>`).join('') ||
'<tr><td colspan="3">No rates set</td></tr>';
  const staleColor = s.stale ? '#f08a8a' : '#5fd38a';
  return `<!doctype html><html><head><meta charset="utf-8"/><title>Currency</title>
<style>
    body{background:#0f1115;color:#e6e6e6;font:14px/1.5 system-ui,sans-serif;margin:0;padding:32px}
    h1{font-size:20px;margin:0 0 4px}.muted{color:#8a8f98;margin-bottom:24px}
    .cards{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:24px}
    .card{background:#181b22;border:1px solid #242833;border-radius:12px;padding:16px 20px;min-width:130px}
  .card .n{font-size:28px;font-weight:700}.card .l{color:#8a8f98;font-size:12px;text-transform:uppercase;letter-spacing:.04em}
    table{border-collapse:collapse;width:100%;max-width:480px;background:#181b22;border-radius:12px;overflow:hidden}
    th,td{text-align:left;padding:10px 14px;border-bottom:1px solid #242833}th{color:#8a8f98}
  .pill{display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:600}
</style></head><body>
    <h1>Multi-Currency & FX Snapshot</h1>
    <div class="muted">Base: <strong>${s.base}</strong> &middot; rates <span class="pill"
style="background:${staleColor}22;color:${staleColor}">${s.stale ? 'STALE' : 'fresh'}</span> (${s.ageHours}h old)</div>
  <div class="cards">
     <div class="card"><div class="n">${s.currencies}</div><div class="l">Currencies</div></div>
     <div class="card"><div class="n">${s.snapshots}</div><div class="l">Order snapshots</div></div>
      <div class="card"><div class="n">${s.ageHours}h</div><div class="l">Rate age</div></div>
    </div>
  <table><thead><tr><th>Currency</th><th>Per 1 ${s.base}</th><th>Example (${s.base} 1000)</th></tr></thead><tbody>${rows}
</tbody></table>
</body></html>`;
}


module.exports = { register, startAutoRefresh, stopAutoRefresh, core, renderDashboard };
