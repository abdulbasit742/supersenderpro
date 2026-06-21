// src/modules/fraudGuard/index.js
// Express routes + /fraud-guard dashboard for the Payment Fraud Guard.


'use strict';

const core = require('./fraudGuard');


function register(app) {
 app.post('/api/fraud-guard/check', (req, res) => {
     try { res.json({ ok: true, verdict: core.check(req.body || {}) }); }
     catch (err) { res.status(400).json({ ok: false, error: String(err && err.message ? err.message : err) }); }
   });

   app.post('/api/fraud-guard/release', (req, res) => {
     const t = req.body && req.body.txnId;
     if (!t) return res.status(400).json({ ok: false, error: 'txnId required' });
     res.json({ ok: true, ...core.releaseTxn(t) });
   });

   app.get('/api/fraud-guard/status', (_req, res) => res.json({ ok: true, ...core.getStats() }));

   app.get('/fraud-guard', (_req, res) => res.send(renderDashboard(core.getStats())));
   return { core };
}

function renderDashboard(s) {
 const bandColor = (b) => ({ clean: '#5fd38a', suspicious: '#f0c674', fraud: '#f08a8a' }[b] || '#8a8f98');
   const decColor = (d) => ({ allow: '#5fd38a', review: '#f0c674', block: '#f08a8a' }[d] || '#8a8f98');
   const rows = s.recent.map((c) => {
     const bc = bandColor(c.band), dc = decColor(c.decision);
     return `<tr>
         <td><span class="pill" style="background:${bc}22;color:${bc}">${c.band}</span></td>
         <td>${c.risk}</td>
         <td><span class="pill" style="background:${dc}22;color:${dc}">${c.decision}</span></td>
         <td class="txt">${c.reason}</td>
     </tr>`;
   }).join('') || '<tr><td colspan="4">No checks yet</td></tr>';
 return `<!doctype html><html><head><meta charset="utf-8"/><title>Fraud Guard</title>
<style>
   body{background:#0f1115;color:#e6e6e6;font:14px/1.5 system-ui,sans-serif;margin:0;padding:32px}
   h1{font-size:20px;margin:0 0 4px}.muted{color:#8a8f98;margin-bottom:24px}
   .cards{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:24px}
   .card{background:#181b22;border:1px solid #242833;border-radius:12px;padding:16px 20px;min-width:130px}
 .card .n{font-size:28px;font-weight:700}.card .l{color:#8a8f98;font-size:12px;text-transform:uppercase;letter-spacing:.04em}
   table{border-collapse:collapse;width:100%;max-width:640px;background:#181b22;border-radius:12px;overflow:hidden}
   th,td{text-align:left;padding:10px 14px;border-bottom:1px solid #242833}th{color:#8a8f98}
   .txt{color:#cfd3da}
   .pill{display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:600;text-transform:capitalize}
     .dry{background:#3a2e12;color:#f0c674}.live{background:#10331f;color:#5fd38a}
     .topbar{display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:600}
</style></head><body>
  <h1>Payment Fraud Guard</h1>
  <div class="muted">Mode: <span class="topbar ${s.config.dryRun ? 'dry' : 'live'}">${s.config.dryRun ? 'DRY-RUN (advisory)' : 'LIVE (enforcing)'}</span> &middot; review ≥${s.config.reviewAt} &middot; block ≥${s.config.blockAt}</div>
     <div class="cards">
       <div class="card"><div class="n">${s.totalChecks}</div><div class="l">Checks</div></div>
      <div class="card"><div class="n">${s.uniqueTxns}</div><div class="l">Unique TXNs</div></div>
      <div class="card"><div class="n">${s.byBand.fraud || 0}</div><div class="l">Fraud flagged</div></div>
       <div class="card"><div class="n">${s.byDecision.review || 0}</div><div class="l">Sent to review</div></div>
     </div>
  <table><thead><tr><th>Band</th><th>Risk</th><th>Decision</th><th>Reason</th></tr></thead><tbody>${rows}</tbody></table>
</body></html>`;
}

module.exports = { register, renderDashboard, core };
