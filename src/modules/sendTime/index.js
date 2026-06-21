// src/modules/sendTime/index.js
// Express routes + /send-time dashboard for the Send-Time Optimizer.


'use strict';

const core = require('./sendTime');


function register(app) {
 app.post('/api/send-time/send', (req, res) => {
    const num = req.body && req.body.customerNumber;
    if (!num) return res.status(400).json({ ok: false, error: 'customerNumber required' });
     res.json({ ok: true, ...core.recordSend(num) });
   });

   app.post('/api/send-time/response', (req, res) => {
    const num = req.body && req.body.customerNumber;
    if (!num) return res.status(400).json({ ok: false, error: 'customerNumber required' });
     res.json({ ok: true, ...core.recordResponse(num) });
   });


   app.get('/api/send-time/advise/:number', (req, res) => res.json({ ok: true, ...core.advise(req.params.number) }));
 app.get('/api/send-time/profile/:number', (req, res) => res.json({ ok: true, ...core.customerProfile(req.params.number)
}));
   app.get('/api/send-time/status', (_req, res) => res.json({ ok: true, ...core.getStats() }));

   app.get('/send-time', (_req, res) => res.send(renderDashboard(core.getStats())));
   return { core };
}


function fmtHour(h) {
 const ampm = h < 12 ? 'am' : 'pm';
   const hr = h % 12 === 0 ? 12 : h % 12;
   return `${hr}${ampm}`;
}

function renderDashboard(s) {
 const maxRate = Math.max(0.001, ...s.hourly.map((x) => x.rate));
   const bars = s.hourly.map((x) => {
     const pct = Math.round((x.rate / maxRate) * 100);
    const isBest = x.hour === s.globalBestHour;
    const col = isBest ? '#5fd38a' : '#3a72d4';
    return `<div class="col" title="${fmtHour(x.hour)} - rate ${x.rate} (${x.responses}/${x.sends})">
      <div class="barwrap"><div class="bar" style="height:${pct}%;background:${col}"></div></div>
      <div class="hr">${x.hour}</div>
    </div>`;
   }).join('');
   const topRows = s.topHours.map((t) => `<tr><td>${fmtHour(t.hour)}</td><td>${t.rate}</td><td>${t.responses}/${t.sends}
</td></tr>`).join('') || '<tr><td colspan="3">No data yet</td></tr>';
 return `<!doctype html><html><head><meta charset="utf-8"/><title>Send-Time</title>


<style>
  body{background:#0f1115;color:#e6e6e6;font:14px/1.5 system-ui,sans-serif;margin:0;padding:32px}
  h1{font-size:20px;margin:0 0 4px}.muted{color:#8a8f98;margin-bottom:24px}
  h2{font-size:13px;color:#8a8f98;text-transform:uppercase;letter-spacing:.04em;margin:24px 0 8px}
  .cards{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:8px}
  .card{background:#181b22;border:1px solid #242833;border-radius:12px;padding:16px 20px;min-width:140px}
  .card .n{font-size:28px;font-weight:700}.card .l{color:#8a8f98;font-size:12px;text-transform:uppercase;letter-spacing:.04em}
  .chart{display:flex;align-items:flex-end;gap:3px;height:180px;background:#181b22;border:1px solid #242833;border-radius:12px;padding:16px;max-width:860px}
  .col{flex:1;display:flex;flex-direction:column;align-items:center;height:100%}
  .barwrap{flex:1;display:flex;align-items:flex-end;width:100%}
  .bar{width:100%;border-radius:3px 3px 0 0;min-height:2px}
  .hr{font-size:10px;color:#8a8f98;margin-top:4px}
  table{border-collapse:collapse;width:100%;max-width:360px;background:#181b22;border-radius:12px;overflow:hidden}
  th,td{text-align:left;padding:9px 14px;border-bottom:1px solid #242833}th{color:#8a8f98}
</style></head><body>
  <h1>Send-Time Optimizer</h1>
  <div class="muted">Global best hour: <strong>${fmtHour(s.globalBestHour)}</strong> &middot; ${s.trackedCustomers}
customers &middot; ${s.globalSamples} sends tracked</div>
  <div class="cards">
    <div class="card"><div class="n">${fmtHour(s.globalBestHour)}</div><div class="l">Best hour</div></div>
    <div class="card"><div class="n">${s.trackedCustomers}</div><div class="l">Customers</div></div>
    <div class="card"><div class="n">${s.globalSamples}</div><div class="l">Sends</div></div>
  </div>
  <h2>Response rate by hour (customer local time)</h2>
  <div class="chart">${bars}</div>
  <h2>Top hours</h2>
  <table><thead><tr><th>Hour</th><th>Rate</th><th>Resp/Sends</th></tr></thead><tbody>${topRows}</tbody></table>
</body></html>`;
}

module.exports = { register, renderDashboard, core };
