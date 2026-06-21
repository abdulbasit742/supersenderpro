// src/modules/banRisk/index.js
// Express routes + /ban-risk dashboard + optional periodic evaluation.


'use strict';

const core = require('./banRisk');


let _timer = null;

function register(app, deps = {}, opts = {}) {
 app.post('/api/ban-risk/send', (req, res) => {
     const b = req.body || {};
     if (!b.numberId) return res.status(400).json({ ok: false, error: 'numberId required' });
     core.recordSend(b.numberId, { toNewContact: !!b.toNewContact, hour: b.hour });
     res.json({ ok: true });
   });


   app.post('/api/ban-risk/failure', (req, res) => {
     const b = req.body || {};
     if (!b.numberId) return res.status(400).json({ ok: false, error: 'numberId required' });
     core.recordFailure(b.numberId);
     res.json({ ok: true });
   });

   app.post('/api/ban-risk/inbound', (req, res) => {
     const b = req.body || {};
     if (!b.numberId) return res.status(400).json({ ok: false, error: 'numberId required' });
     core.recordInbound(b.numberId);
     res.json({ ok: true });
   });

   app.get('/api/ban-risk/status', (_req, res) => res.json({ ok: true, ...core.getStats() }));
   app.get('/api/ban-risk/:id', (req, res) => res.json({ ok: true, ...core.forecast(req.params.id) }));

   app.get('/ban-risk', (_req, res) => res.send(renderDashboard(core.getStats())));

   startScheduler(deps, opts);
   return { core };
}

function startScheduler(deps, opts = {}) {
   if (_timer) clearInterval(_timer);
   const tickMs = opts.tickMs || Number(process.env.BAN_RISK_TICK_MS || 15 * 60 * 1000); // every 15 min
   _timer = setInterval(() => core.evaluateAll(deps).catch((e) => console.error('[banRisk] eval error:', e)), tickMs);
   if (_timer.unref) _timer.unref();
   setTimeout(() => core.evaluateAll(deps).catch(() => {}), 12000);
}
function stopScheduler() { if (_timer) clearInterval(_timer); _timer = null; }


function renderDashboard(s) {
  const color = (b) => ({ calm: '#5fd38a', caution: '#9ecbff', elevated: '#f0c674', imminent: '#f08a8a' }[b] ||
'#8a8f98');
  const rows = s.ranked.map((f) => {
    const c = color(f.band);
    return `<tr>
      <td>${f.numberId}</td>
      <td><div class="bar"><div class="fill" style="width:${f.forecast}%;background:${c}"></div></div><span
class="sc">${f.forecast}</span></td>
      <td><span class="pill" style="background:${c}22;color:${c}">${f.band}</span></td>
      <td class="txt">${(f.reasons || []).join(', ') || '-'}</td>
    </tr>`;
  }).join('') || '<tr><td colspan="4">No numbers tracked yet</td></tr>';
  const alertRows = s.recentAlerts.map((a) => `<tr><td>${a.numberId}</td><td>${a.band}</td><td>${a.forecast}</td><td
class="txt">${(a.reasons||[]).join(', ')}</td></tr>`).join('') || '<tr><td colspan="4">No alerts</td></tr>';
  return `<!doctype html><html><head><meta charset="utf-8"/><title>Ban Risk</title>
<style>
  body{background:#0f1115;color:#e6e6e6;font:14px/1.5 system-ui,sans-serif;margin:0;padding:32px}
  h1{font-size:20px;margin:0 0 4px}.muted{color:#8a8f98;margin-bottom:24px}
  h2{font-size:13px;color:#8a8f98;text-transform:uppercase;letter-spacing:.04em;margin:24px 0 8px}
  .cards{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:8px}
  .card{background:#181b22;border:1px solid #242833;border-radius:12px;padding:16px 20px;min-width:120px}
  .card .n{font-size:28px;font-weight:700}.card .l{color:#8a8f98;font-size:12px;text-transform:uppercase;letter-
spacing:.04em}
  table{border-collapse:collapse;width:100%;max-width:820px;background:#181b22;border-radius:12px;overflow:hidden}
  th,td{text-align:left;padding:10px 14px;border-bottom:1px solid #242833;vertical-align:middle}th{color:#8a8f98}
  .bar{display:inline-block;width:110px;height:8px;background:#242833;border-radius:4px;overflow:hidden;vertical-
align:middle}
  .fill{height:100%}.sc{margin-left:8px;color:#cfd3da}.txt{color:#cfd3da;font-size:13px}
  .pill{display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:600;text-
transform:capitalize}
</style></head><body>
  <h1>Ban-Risk Early-Warning</h1>
  <div class="muted">${s.trackedNumbers} numbers monitored &middot; alert at forecast ≥${s.config.alertAt}</div>
  <div class="cards">
    <div class="card"><div class="n">${s.byBand.imminent || 0}</div><div class="l">Imminent</div></div>
    <div class="card"><div class="n">${s.byBand.elevated || 0}</div><div class="l">Elevated</div></div>
    <div class="card"><div class="n">${s.byBand.caution || 0}</div><div class="l">Caution</div></div>
    <div class="card"><div class="n">${s.byBand.calm || 0}</div><div class="l">Calm</div></div>
  </div>
  <h2>Forecast by number</h2>
  <table><thead><tr><th>Number</th><th>Forecast</th><th>Band</th><th>Why</th></tr></thead><tbody>${rows}</tbody></table>
  <h2>Recent alerts</h2>
  <table><thead><tr><th>Number</th><th>Band</th><th>Forecast</th><th>Reasons</th></tr></thead><tbody>${alertRows}</tbody>
</table>
</body></html>`;
}


module.exports = { register, startScheduler, stopScheduler, core, renderDashboard };
