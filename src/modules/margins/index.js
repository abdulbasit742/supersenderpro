// src/modules/margins/index.js
// Express routes + /margins dashboard for Per-Tool Profit Margin Reporting.


'use strict';

const core = require('./margins');


function register(app) {
 app.post('/api/margins/sale', (req, res) => {
     try { res.json({ ok: true, ...core.recordSale(req.body || {}) }); }
     catch (err) { res.status(400).json({ ok: false, error: String(err && err.message ? err.message : err) }); }
   });

   app.get('/api/margins/report', (req, res) => {
     const opts = { allTime: req.query.allTime === 'true', windowDays: req.query.windowDays ? Number(req.query.windowDays)
: undefined };
   res.json({ ok: true, ...core.report(opts) });
   });

   app.get('/api/margins/status', (_req, res) => res.json({ ok: true, ...core.getStats() }));

   app.get('/margins', (_req, res) => res.send(renderDashboard(core.report())));
   return { core };
}

function renderDashboard(r) {
 const cur = r.currency;
   const money = (n) => `${cur} ${Number(n || 0).toLocaleString()}`;
   const marginColor = (m, loss) => loss ? '#f08a8a' : m < (r.config.thinThreshold * 100) ? '#f0c674' : '#5fd38a';
   const rows = r.tools.map((t) => {
     const c = marginColor(t.margin, t.lossMaking);
     const tag = t.lossMaking ? '<span class="tag loss">loss</span>' : t.thin ? '<span class="tag thin">thin</span>' : '';
     return `<tr>
         <td>${t.productName} ${tag}</td>
         <td>${t.units}</td>
         <td>${money(t.revenue)}</td>
         <td>${money(t.cost)}</td>
         <td style="color:${c};font-weight:600">${money(t.grossProfit)}</td>
         <td style="color:${c}">${t.margin}%</td>
       <td>${money(t.avgProfitPerUnit)}</td>
     </tr>`;
   }).join('') || '<tr><td colspan="7">No sales recorded yet</td></tr>';
   return `<!doctype html><html><head><meta charset="utf-8"/><title>Margins</title>
<style>
 body{background:#0f1115;color:#e6e6e6;font:14px/1.5 system-ui,sans-serif;margin:0;padding:32px}
   h1{font-size:20px;margin:0 0 4px}.muted{color:#8a8f98;margin-bottom:24px}
   .cards{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:24px}
   .card{background:#181b22;border:1px solid #242833;border-radius:12px;padding:16px 20px;min-width:150px}
   .card .n{font-size:24px;font-weight:700}.card .l{color:#8a8f98;font-size:12px;text-transform:uppercase;letter-


spacing:.04em}
  .card.hl .n{color:#5fd38a}
  table{border-collapse:collapse;width:100%;max-width:840px;background:#181b22;border-radius:12px;overflow:hidden}
  th,td{text-align:left;padding:10px 14px;border-bottom:1px solid #242833}th{color:#8a8f98}
  .tag{font-size:10px;border-radius:4px;padding:1px 6px;margin-left:6px}
  .tag.thin{background:#3a2e12;color:#f0c674}.tag.loss{background:#3a1212;color:#f08a8a}
  .trap{background:#181b22;border:1px solid #3a3012;border-radius:10px;padding:12px 16px;max-width:808px;margin-
bottom:20px;color:#f0c674}
</style></head><body>
  <h1>Per-Tool Profit Margins</h1>
  <div class="muted">Last ${r.windowDays || 'all'} days &middot; ranked by profit, not volume</div>
  <div class="cards">
    <div class="card hl"><div class="n">${money(r.totals.grossProfit)}</div><div class="l">Gross profit</div></div>
      <div class="card"><div class="n">${money(r.totals.revenue)}</div><div class="l">Revenue</div></div>
      <div class="card"><div class="n">${r.totals.margin}%</div><div class="l">Blended margin</div></div>
    <div class="card"><div class="n">${r.totals.units}</div><div class="l">Units sold</div></div>
  </div>
  ${r.trap ? `<div class="trap">  ⚠️
                                   Your best <strong>seller</strong> (${r.trap.volumeLeader}) is NOT your best
<strong>earner</strong> (${r.trap.profitLeader}). Push the earner.</div>` : ''}
  <table><thead><tr><th>Tool</th><th>Units</th><th>Revenue</th><th>Cost</th><th>Gross profit</th><th>Margin</th>
<th>Profit/unit</th></tr></thead><tbody>${rows}</tbody></table>
</body></html>`;
}


module.exports = { register, renderDashboard, core };
