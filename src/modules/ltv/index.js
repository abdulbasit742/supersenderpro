// src/modules/ltv/index.js
// Express routes + /ltv dashboard for the Customer LTV + Cohort Value module.


'use strict';

const core = require('./ltv');


function register(app, deps = {}) {
  app.post('/api/ltv/payment', (req, res) => {
      try { res.json({ ok: true, record: core.recordPayment(req.body || {}) }); }
      catch (err) { res.status(400).json({ ok: false, error: String(err && err.message ? err.message : err) }); }
    });

  app.get('/api/ltv/customer/:number', (req, res) => res.json({ ok: true, ...core.customerLTV(req.params.number, deps)
}));
    app.get('/api/ltv/cohorts', (_req, res) => res.json({ ok: true, cohorts: core.cohorts(deps) }));
    app.get('/api/ltv/summary', (_req, res) => res.json({ ok: true, ...core.summary(deps) }));

    app.get('/ltv', (_req, res) => res.send(renderDashboard(core.summary(deps))));
    return { core };
}

function renderDashboard(s) {
    const cur = s.currency;
    const money = (n) => `${cur} ${Number(n || 0).toLocaleString()}`;
    const mask = (num) => String(num).replace(/.(?=.{4})/g, '•');
    const cohortRows = s.cohorts.map((c) => `<tr><td>${c.cohort}</td><td>${c.customers}</td><td>${money(c.avgHistorical)}
</td><td>${money(c.avgExpected)}</td></tr>`).join('') || '<tr><td colspan="4">No cohorts yet</td></tr>';
  const topRows = s.topCustomers.map((c) => `<tr><td>${mask(c.customerNumber)}</td><td>${money(c.expected)}</td>
<td>${money(c.historical)}</td><td>${c.churnRisk}</td></tr>`).join('') || '<tr><td colspan="4">No customers yet</td>\n</tr>';
  return `<!doctype html><html><head><meta charset="utf-8"/><title>LTV</title>
<style>
    body{background:#0f1115;color:#e6e6e6;font:14px/1.5 system-ui,sans-serif;margin:0;padding:32px}
    h1{font-size:20px;margin:0 0 4px}.muted{color:#8a8f98;margin-bottom:24px}
    h2{font-size:13px;color:#8a8f98;text-transform:uppercase;letter-spacing:.04em;margin:24px 0 8px}
    .cards{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:8px}
    .card{background:#181b22;border:1px solid #242833;border-radius:12px;padding:16px 20px;min-width:150px}
    .card .n{font-size:24px;font-weight:700}.card .l{color:#8a8f98;font-size:12px;text-transform:uppercase;letter-spacing:.04em}
  .card.hl{border-color:#2c5e3f}.card.hl .n{color:#5fd38a}
    .tables{display:flex;gap:16px;flex-wrap:wrap}
    table{border-collapse:collapse;width:100%;max-width:440px;background:#181b22;border-radius:12px;overflow:hidden}
  th,td{text-align:left;padding:9px 14px;border-bottom:1px solid #242833}th{color:#8a8f98}
</style></head><body>
    <h1>Customer LTV & Cohort Value</h1>
    <div class="muted">${s.customers} customers analyzed</div>
    <div class="cards">
      <div class="card"><div class="n">${money(s.avgExpectedLTV)}</div><div class="l">Avg expected LTV</div></div>


       <div class="card"><div class="n">${money(s.medianExpectedLTV)}</div><div class="l">Median expected LTV</div></div>
       <div class="card"><div class="n">${money(s.avgHistoricalLTV)}</div><div class="l">Avg historical LTV</div></div>
       <div class="card hl"><div class="n">${money(s.suggestedMaxCAC)}</div><div class="l">Suggested max CAC</div></div>
     </div>
     <div class="tables">
     <div><h2>Cohorts by signup month</h2><table><thead><tr><th>Cohort</th><th>Customers</th><th>Avg hist.</th><th>Avg
 expected</th></tr></thead><tbody>${cohortRows}</tbody></table></div>
     <div><h2>Top customers by expected LTV</h2><table><thead><tr><th>Customer</th><th>Expected</th><th>Historical</th>
 <th>Churn</th></tr></thead><tbody>${topRows}</tbody></table></div>
   </div>
 </body></html>`;
 }

 module.exports = { register, renderDashboard, core };
