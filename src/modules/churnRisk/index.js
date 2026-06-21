// src/modules/churnRisk/index.js
// Express routes + /churn-risk dashboard for the Churn-Risk module.


'use strict';

const core = require('./churnRisk');


function register(app) {
 app.post('/api/churn-risk/purchase', (req, res) => {
     const b = req.body || {};
     if (!b.customerNumber) return res.status(400).json({ ok: false, error: 'customerNumber required' });
     res.json({ ok: true, record: core.onPurchase(b.customerNumber, { plan: b.plan, expiresAt: b.expiresAt }) });
   });

   app.post('/api/churn-risk/signal', (req, res) => {
     const b = req.body || {};
     const map = { inbound: core.onInboundMessage, complaint: core.onComplaint, payment_failure: core.onPaymentFailure };
     const fn = map[b.type];
     if (!b.customerNumber || !fn) return res.status(400).json({ ok: false, error: 'customerNumber and valid type required\n(inbound|complaint|payment_failure)' });
   res.json({ ok: true, record: fn(b.customerNumber) });
   });


 app.get('/api/churn-risk/at-risk', (req, res) => res.json({ ok: true, list: core.atRiskList(Number(req.query.limit) ||
20) }));
   app.get('/api/churn-risk/status', (_req, res) => res.json({ ok: true, ...core.getStats() }));
   app.get('/api/churn-risk/:number', (req, res) => res.json({ ok: true, ...core.scoreOf(req.params.number) }));


   app.get('/churn-risk', (_req, res) => res.send(renderDashboard(core.getStats())));
   return { core };
}

function renderDashboard(s) {
 const color = (band) => ({ safe: '#5fd38a', watch: '#9ecbff', at_risk: '#f0c674', critical: '#f08a8a' }[band] ||
'#8a8f98');
   const mask = (num) => String(num).replace(/.(?=.{4})/g, '•'); // privacy: show last 4 only
   const rows = s.top.map((c) => {
     const col = color(c.band);
     return `<tr>
         <td>${mask(c.customerNumber)}</td>
         <td><div class="bar"><div class="fill" style="width:${c.score}%;background:${col}"></div></div><span
class="sc">${c.score}</span></td>
     <td><span class="pill" style="background:${col}22;color:${col}">${c.band.replace('_', ' ')}</span></td>
         <td>${c.complaints || 0}</td>
         <td>${c.paymentFailures || 0}</td>
     </tr>`;
   }).join('') || '<tr><td colspan="5">No customers scored yet</td></tr>';
 return `<!doctype html><html><head><meta charset="utf-8"/><title>Churn Risk</title>
<style>


    body{background:#0f1115;color:#e6e6e6;font:14px/1.5 system-ui,sans-serif;margin:0;padding:32px}
    h1{font-size:20px;margin:0 0 4px}.muted{color:#8a8f98;margin-bottom:24px}
    .cards{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:24px}
    .card{background:#181b22;border:1px solid #242833;border-radius:12px;padding:16px 20px;min-width:120px}
    .card .n{font-size:28px;font-weight:700}.card .l{color:#8a8f98;font-size:12px;text-transform:uppercase;letter-spacing:.04em}
  table{border-collapse:collapse;width:100%;max-width:700px;background:#181b22;border-radius:12px;overflow:hidden}
    th,td{text-align:left;padding:10px 14px;border-bottom:1px solid #242833;vertical-align:middle}th{color:#8a8f98}
    .bar{display:inline-block;width:120px;height:8px;background:#242833;border-radius:4px;overflow:hidden;vertical-
align:middle}
  .fill{height:100%}.sc{margin-left:8px;color:#cfd3da}
  .pill{display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:600;text-
transform:capitalize}
</style></head><body>
  <h1>Churn-Risk Radar</h1>
    <div class="muted">${s.total} customers scored &middot; avg risk ${s.avgScore}</div>
    <div class="cards">
     <div class="card"><div class="n">${s.byBand.critical || 0}</div><div class="l">Critical</div></div>
     <div class="card"><div class="n">${s.byBand.at_risk || 0}</div><div class="l">At risk</div></div>
     <div class="card"><div class="n">${s.byBand.watch || 0}</div><div class="l">Watch</div></div>
     <div class="card"><div class="n">${s.byBand.safe || 0}</div><div class="l">Safe</div></div>
    </div>
    <table><thead><tr><th>Customer</th><th>Risk</th><th>Band</th><th>Complaints</th><th>Pay fails</th></tr></thead>
<tbody>${rows}</tbody></table>
</body></html>`;
}


module.exports = { register, renderDashboard, core };
