// src/modules/revenue/index.js
// Express routes + /revenue dashboard for the Revenue & MRR module.


'use strict';

const core = require('./revenue');


function register(app) {
 // Ingest an event over HTTP (also callable in-process via core.record).
   app.post('/api/revenue/event', (req, res) => {
     try { res.json({ ok: true, event: core.record(req.body || {}) }); }
     catch (err) { res.status(400).json({ ok: false, error: String(err && err.message ? err.message : err) }); }
   });

   app.get('/api/revenue/summary', (_req, res) => res.json({ ok: true, ...core.summarize() }));
 app.get('/api/revenue/series', (req, res) => res.json({ ok: true, series: core.dailySeries(Number(req.query.days) ||
30) }));
   app.get('/revenue', (_req, res) => res.send(renderDashboard(core.getStats())));
   return { core };
}

function sparkline(series, w = 620, h = 80) {
 const vals = series.map((p) => p.amount);
   const max = Math.max(1, ...vals);
   const step = series.length > 1 ? w / (series.length - 1) : w;
   const pts = series.map((p, i) => `${(i * step).toFixed(1)},${(h - (p.amount / max) * (h - 8) - 4).toFixed(1)}`);
   const line = pts.join(' ');
   const area = `0,${h} ${line} ${w},${h}`;
   return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="none">
    <polygon points="${area}" fill="#5fd38a14"/>
    <polyline points="${line}" fill="none" stroke="#5fd38a" stroke-width="2"/>
   </svg>`;
}

function renderDashboard(s) {
   const cur = s.currency;
   const fmt = (n) => `${cur} ${Number(n).toLocaleString()}`;
 return `<!doctype html><html><head><meta charset="utf-8"/><title>Revenue</title>
<style>
   body{background:#0f1115;color:#e6e6e6;font:14px/1.5 system-ui,sans-serif;margin:0;padding:32px}
   h1{font-size:20px;margin:0 0 4px}.muted{color:#8a8f98;margin-bottom:24px}
 .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px;max-width:860px;margin-bottom:28px}
   .card{background:#181b22;border:1px solid #242833;border-radius:12px;padding:18px 20px}
   .card .n{font-size:26px;font-weight:700;letter-spacing:-.5px}
   .card .l{color:#8a8f98;font-size:12px;text-transform:uppercase;letter-spacing:.04em;margin-top:2px}
   .card .s{font-size:12px;margin-top:6px}
   .up{color:#5fd38a}.down{color:#f08a8a}
   .panel{background:#181b22;border:1px solid #242833;border-radius:12px;padding:18px 20px;max-width:860px}


    .panel h2{font-size:13px;color:#8a8f98;text-transform:uppercase;letter-spacing:.04em;margin:0 0 12px}
</style></head><body>
  <h1>Revenue & MRR</h1>
    <div class="muted">${s.activeSubscribers} active subscribers &middot; ${s.totalEvents} events tracked</div>
    <div class="grid">
     <div class="card"><div class="n">${fmt(s.mrr)}</div><div class="l">MRR</div></div>
     <div class="card"><div class="n">${fmt(s.revenueMonth)}</div><div class="l">Revenue this month</div></div>
     <div class="card"><div class="n">${fmt(s.revenueToday)}</div><div class="l">Revenue today</div></div>
     <div class="card"><div class="n">${fmt(s.arpu)}</div><div class="l">ARPU</div></div>
    <div class="card"><div class="n">${s.activeSubscribers}</div><div class="l">Active subs</div><div class="s
up">+${s.newThisMonth} new</div></div>
    <div class="card"><div class="n">${s.churnRate}%</div><div class="l">Churn rate</div><div class="s
down">${s.churnedThisMonth} churned</div></div>
     <div class="card"><div class="n">${fmt(s.recoveredRevenue)}</div><div class="l">Recovered (win-back)</div></div>
     <div class="card"><div class="n">${fmt(s.refunds)}</div><div class="l">Refunds</div></div>
    </div>
    <div class="panel">
     <h2>Revenue, last 30 days</h2>
     ${sparkline(s.series)}
  </div>
</body></html>`;
}


module.exports = { register, renderDashboard, core };
