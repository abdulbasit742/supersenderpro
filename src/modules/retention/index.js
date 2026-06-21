// src/modules/retention/index.js
// Express routes + /retention dashboard (the color-coded retention triangle).


'use strict';

const core = require('./retention');


function register(app) {
 app.post('/api/retention/activity', (req, res) => {
     const b = req.body || {};
     if (!b.customerNumber) return res.status(400).json({ ok: false, error: 'customerNumber required' });
     try { res.json({ ok: true, ...core.recordActivity(b.customerNumber, b.at) }); }
     catch (err) { res.status(400).json({ ok: false, error: String(err && err.message ? err.message : err) }); }
   });

   app.get('/api/retention/triangle', (_req, res) => res.json({ ok: true, ...core.triangle() }));
   app.get('/api/retention/status', (_req, res) => res.json({ ok: true, ...core.getStats() }));

   app.get('/retention', (_req, res) => res.send(renderDashboard(core.getStats())));
   return { core };
}

// Heat color from a retention pct (red low -> green high).
function heat(pct) {
 if (pct == null) return 'transparent';
   const h = Math.round((pct / 100) * 130); // 0=red, 130=green
   return `hsl(${h}, 55%, 28%)`;
}


function renderDashboard(s) {
 const maxOff = Math.max(0, ...s.triangle.map((r) => r.offsets.length - 1));
   const headCells = ['Cohort', 'Size'];
   for (let i = 0; i <= maxOff; i++) headCells.push(`M${i}`);
   const head = headCells.map((h) => `<th>${h}</th>`).join('');

   const rows = s.triangle.map((r) => {
     let cells = `<td>${r.cohort}</td><td>${r.size}</td>`;
     for (let i = 0; i <= maxOff; i++) {
       const o = r.offsets[i];
         if (!o) { cells += '<td class="empty"></td>'; continue; }
         const cliff = r.dropOffMonth === o.offset ? ' ↓' : '';
         cells += `<td style="background:${heat(o.pct)}">${o.pct}%${cliff}</td>`;
     }
     return `<tr>${cells}</tr>`;
   }).join('') || `<tr><td colspan="${maxOff + 3}">No cohorts yet</td></tr>`;

   const avgCells = s.avgCurve.map((a) => `<td style="background:${heat(a.pct)}">${a.pct}%</td>`).join('');

   return `<!doctype html><html><head><meta charset="utf-8"/><title>Retention</title>


<style>
     body{background:#0f1115;color:#e6e6e6;font:14px/1.5 system-ui,sans-serif;margin:0;padding:32px}
     h1{font-size:20px;margin:0 0 4px}.muted{color:#8a8f98;margin-bottom:24px}
     h2{font-size:13px;color:#8a8f98;text-transform:uppercase;letter-spacing:.04em;margin:24px 0 8px}
     .cards{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:16px}
     .card{background:#181b22;border:1px solid #242833;border-radius:12px;padding:16px 20px;min-width:150px}
     .card .n{font-size:24px;font-weight:700}.card .l{color:#8a8f98;font-size:12px;text-transform:uppercase;letter-spacing:.04em}
  table{border-collapse:collapse;background:#181b22;border-radius:12px;overflow:hidden}
     th,td{text-align:center;padding:8px 12px;border:1px solid #0f1115;font-size:13px;min-width:54px}
     th{color:#8a8f98;background:#13161c}
     td:first-child,th:first-child{text-align:left}
     .empty{background:#13161c}
</style></head><body>
  <h1>Cohort Retention Curves</h1>
  <div class="muted">${s.cohorts} cohorts &middot; ${s.totalCustomers} customers${s.dropOffMonth != null ? ` &middot;
biggest drop-off at month ${s.dropOffMonth}` : ''}</div>
     <div class="cards">
       <div class="card"><div class="n">${s.avgM1Retention != null ? s.avgM1Retention + '%' : '-'}</div><div class="l">Avg
M1 retention</div></div>
    <div class="card"><div class="n">${s.dropOffMonth != null ? 'M' + s.dropOffMonth : '-'}</div><div class="l">Drop-off
cliff</div></div>
    <div class="card"><div class="n">${s.cohorts}</div><div class="l">Cohorts</div></div>
     </div>
     <h2>Retention triangle</h2>
     <table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>
     <h2>Average curve (all cohorts)</h2>
  <table><tbody><tr><td>Avg</td><td>-</td>${avgCells}</tr></tbody></table>
</body></html>`;
}

module.exports = { register, renderDashboard, core };
