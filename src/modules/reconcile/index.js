// src/modules/reconcile/index.js
// Express routes + /reconcile dashboard for Payment Auto-Reconciliation.


'use strict';

const core = require('./reconcile');


function register(app, deps = {}) {
 app.post('/api/reconcile/ingest', async (req, res) => {
    const lines = (req.body && req.body.lines) || [];
    try { res.json({ ok: true, result: await core.ingest(lines, deps) }); }
     catch (err) { res.status(400).json({ ok: false, error: String(err && err.message ? err.message : err) }); }
   });

   app.get('/api/reconcile/status', (_req, res) => res.json({ ok: true, ...core.getStats() }));

   app.get('/reconcile', (_req, res) => res.send(renderDashboard(core.getStats())));

   return { core, api: { ingest: (lines) => core.ingest(lines, deps) } };
}

function renderDashboard(s) {
 const cur = s.config.currency;
   const r = s.lastRun;
   const money = (n) => `${cur} ${Number(n || 0).toLocaleString()}`;
   const runRows = s.recentRuns.map((run) => `<tr>
     <td>${new Date(run.at).toISOString().slice(0, 16).replace('T', ' ')}</td>
    <td>${run.matchedCount} (${money(run.matchedAmount)})</td>
    <td>${run.unmatchedDepositCount}</td>
    <td>${run.missingPaymentCount}</td>
    <td>${run.mismatchedCount}</td>
   </tr>`).join('') || '<tr><td colspan="5">No reconciliation runs yet</td></tr>';
   return `<!doctype html><html><head><meta charset="utf-8"/><title>Reconcile</title>
<style>
 body{background:#0f1115;color:#e6e6e6;font:14px/1.5 system-ui,sans-serif;margin:0;padding:32px}
   h1{font-size:20px;margin:0 0 4px}.muted{color:#8a8f98;margin-bottom:24px}
   h2{font-size:13px;color:#8a8f98;text-transform:uppercase;letter-spacing:.04em;margin:24px 0 8px}
   .cards{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:8px}
   .card{background:#181b22;border:1px solid #242833;border-radius:12px;padding:16px 20px;min-width:150px}
 .card .n{font-size:24px;font-weight:700}.card .l{color:#8a8f98;font-size:12px;text-transform:uppercase;letter-spacing:.04em}
   .card .s{font-size:12px;color:#8a8f98;margin-top:4px}
   .ok{color:#5fd38a}.warn{color:#f0c674}.bad{color:#f08a8a}
   table{border-collapse:collapse;width:100%;max-width:760px;background:#181b22;border-radius:12px;overflow:hidden}
   th,td{text-align:left;padding:9px 14px;border-bottom:1px solid #242833}th{color:#8a8f98}
</style></head><body>
 <h1>Payment Auto-Reconciliation</h1>
   <div class="muted">${s.totalLines} statement lines processed &middot; ${s.matchedOrders} orders reconciled</div>
   <div class="cards">


      <div class="card"><div class="n ok">${r ? r.matchedCount : 0}</div><div class="l">Matched</div><div
class="s">${money(r && r.matchedAmount)}</div></div>
    <div class="card"><div class="n warn">${r ? r.unmatchedDepositCount : 0}</div><div class="l">Unmatched deposits</div>
<div class="s">money in, no order</div></div>
    <div class="card"><div class="n bad">${r ? r.missingPaymentCount : 0}</div><div class="l">Missing payments</div><div
class="s">order, no money</div></div>
    <div class="card"><div class="n warn">${r ? r.mismatchedCount : 0}</div><div class="l">Amount mismatch</div></div>
     </div>
     <h2>Recent runs</h2>
  <table><thead><tr><th>When</th><th>Matched</th><th>Unmatched dep.</th><th>Missing pay.</th><th>Mismatch</th></tr>
</thead><tbody>${runRows}</tbody></table>
</body></html>`;
}

module.exports = { register, renderDashboard, core };
