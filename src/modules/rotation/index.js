// src/modules/rotation/index.js
// Express routes + /rotation dashboard for the Weighted Number Rotation balancer.


'use strict';

const core = require('./rotation');


function register(app, deps = {}) {
 core.bindDeps(deps); // so router can call core.choose() with no deps arg

   app.post('/api/rotation/choose', (req, res) => {
     const b = req.body || {};
     try {
         const pick = core.choose({ customerNumber: b.customerNumber }, deps);
         if (!pick) return res.json({ ok: true, pick: null, reason: 'no eligible number (pool exhausted/unhealthy)' });
       res.json({ ok: true, pick });
     } catch (err) { res.status(500).json({ ok: false, error: String(err && err.message ? err.message : err) }); }
   });

   app.post('/api/rotation/reset-counters', (_req, res) => res.json({ ok: true, ...core.resetCounters() }));
   app.get('/api/rotation/status', (_req, res) => res.json({ ok: true, ...core.snapshot(deps) }));

   app.get('/rotation', (_req, res) => res.send(renderDashboard(core.snapshot(deps))));
   return { core };
}

function renderDashboard(s) {
   const maxW = Math.max(0.001, ...s.weights.map((w) => w.weight));
   const maxCount = Math.max(1, ...Object.values(s.counters));
   const rows = s.weights.map((w) => {
     const wpct = Math.round((w.weight / maxW) * 100);
     const count = s.counters[w.id] || 0;
     const cpct = Math.round((count / maxCount) * 100);
     const dead = w.weight <= 0;
     const col = dead ? '#f08a8a' : '#5fd38a';
     return `<tr>
       <td>${w.id}</td>
     <td><div class="bar"><div class="fill" style="width:${wpct}%;background:${col}"></div></div><span
class="sc">${w.weight}</span></td>
         <td>${w.health}</td>
         <td>${w.forecast}</td>
         <td>${w.headroom != null ? w.headroom : '-'}</td>
         <td><div class="bar"><div class="fill" style="width:${cpct}%;background:#3a72d4"></div></div><span
class="sc">${count}</span></td>
     <td class="reason">${dead ? (w.reason || 'weight 0') : ''}</td>
     </tr>`;
   }).join('') || '<tr><td colspan="7">Pool empty</td></tr>';
 return `<!doctype html><html><head><meta charset="utf-8"/><title>Rotation</title>
<style>


    body{background:#0f1115;color:#e6e6e6;font:14px/1.5 system-ui,sans-serif;margin:0;padding:32px}
    h1{font-size:20px;margin:0 0 4px}.muted{color:#8a8f98;margin-bottom:24px}
    .cards{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:24px}
    .card{background:#181b22;border:1px solid #242833;border-radius:12px;padding:16px 20px;min-width:130px}
    .card .n{font-size:28px;font-weight:700}.card .l{color:#8a8f98;font-size:12px;text-transform:uppercase;letter-
spacing:.04em}
  table{border-collapse:collapse;width:100%;max-width:880px;background:#181b22;border-radius:12px;overflow:hidden}
    th,td{text-align:left;padding:9px 14px;border-bottom:1px solid #242833;vertical-align:middle}th{color:#8a8f98}
    .bar{display:inline-block;width:90px;height:8px;background:#242833;border-radius:4px;overflow:hidden;vertical-
align:middle}
  .fill{height:100%}.sc{margin-left:8px;color:#cfd3da}.reason{color:#f08a8a;font-size:12px}
</style></head><body>
  <h1>Weighted Number Rotation</h1>
  <div class="muted">${s.totalPicks} total picks &middot; ${s.stickyCustomers} sticky customers &middot; min health
${s.config.minHealth} &middot; ban cutoff ${s.config.banRiskCutoff}</div>
    <div class="cards">
      <div class="card"><div class="n">${s.weights.length}</div><div class="l">Pool size</div></div>
    <div class="card"><div class="n">${s.weights.filter((w) => w.weight > 0).length}</div><div class="l">Eligible</div>
</div>
      <div class="card"><div class="n">${s.totalPicks}</div><div class="l">Picks</div></div>
    </div>
  <table><thead><tr><th>Number</th><th>Weight</th><th>Health</th><th>Ban risk</th><th>Headroom</th><th>Sent (picks)</th>
<th></th></tr></thead><tbody>${rows}</tbody></table>
</body></html>`;
}


module.exports = { register, renderDashboard, core };
