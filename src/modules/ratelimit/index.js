// src/modules/ratelimit/index.js
// Express middleware factory + /ratelimit dashboard for Rate Limiting + Abuse Protection.


'use strict';

const core = require('./ratelimit');


function register(app) {
 // Test/inspect inbound guard over HTTP.
   app.post('/api/ratelimit/inbound', (req, res) => {
     const sender = req.body && req.body.sender;
     if (!sender) return res.status(400).json({ ok: false, error: 'sender required' });
     res.json({ ok: true, verdict: core.inboundGuard(sender) });
   });

   app.post('/api/ratelimit/allow', (req, res) => {
     const k = req.body && req.body.key;
     if (!k) return res.status(400).json({ ok: false, error: 'key required' });
     res.json({ ok: true, ...core.allow(k) });
   });

   app.post('/api/ratelimit/block', (req, res) => {
     const b = req.body || {};
     if (!b.key) return res.status(400).json({ ok: false, error: 'key required' });
     res.json({ ok: true, ...core.block(b.key, b.seconds) });
   });

   app.post('/api/ratelimit/unblock', (req, res) => {
     const k = req.body && req.body.key;
     if (!k) return res.status(400).json({ ok: false, error: 'key required' });
     res.json({ ok: true, ...core.unblock(k) });
   });

   app.get('/api/ratelimit/status', (_req, res) => res.json({ ok: true, ...core.getStats() }));

   app.get('/ratelimit', (_req, res) => res.send(renderDashboard(core.getStats())));
   return { core };
}

// Express middleware factory: sliding-window limit per IP+route.
function httpLimiter(name, max, windowSec) {
   return function (req, res, next) {
     const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || req.connection?.remoteAddress ||
'unknown';
   const v = core.httpCheck(name, ip, max, windowSec);
     if (v.allowed) return next();
     res.set('Retry-After', String(v.retryAfter || windowSec));
     return res.status(429).json({ ok: false, error: 'rate limit exceeded', retryAfter: v.retryAfter });
   };


}

function renderDashboard(s) {
  const fmtUntil = (ms) => { const sec = Math.max(0, Math.round((ms - Date.now()) / 1000)); return sec > 60 ?
`${Math.round(sec / 60)}m` : `${sec}s`; };
    const mask = (id) => /^\d+$/.test(String(id)) ? String(id).replace(/.(?=.{4})/g, '•') : id;
    const blockRows = s.activeBlocks.map((b) => `<tr><td>${mask(b.id)}</td><td>${b.manual ? 'manual' : 'auto'}</td>
<td>${fmtUntil(b.until)} left</td></tr>`).join('') || '<tr><td colspan="3">No active blocks</td></tr>';
  const coolRows = s.activeCooldowns.map((c) => `<tr><td>${mask(c.id)}</td><td>${fmtUntil(c.until)} left</td>
</tr>`).join('') || '<tr><td colspan="2">No active cooldowns</td></tr>';
  return `<!doctype html><html><head><meta charset="utf-8"/><title>Rate Limit</title>
<style>
  body{background:#0f1115;color:#e6e6e6;font:14px/1.5 system-ui,sans-serif;margin:0;padding:32px}
    h1{font-size:20px;margin:0 0 4px}.muted{color:#8a8f98;margin-bottom:24px}
    h2{font-size:13px;color:#8a8f98;text-transform:uppercase;letter-spacing:.04em;margin:24px 0 8px}
    .cards{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:8px}
    .card{background:#181b22;border:1px solid #242833;border-radius:12px;padding:16px 20px;min-width:130px}
  .card .n{font-size:24px;font-weight:700}.card .l{color:#8a8f98;font-size:12px;text-transform:uppercase;letter-
spacing:.04em}
    .tables{display:flex;gap:16px;flex-wrap:wrap}
    table{border-collapse:collapse;width:100%;max-width:380px;background:#181b22;border-radius:12px;overflow:hidden}
    th,td{text-align:left;padding:9px 14px;border-bottom:1px solid #242833}th{color:#8a8f98}
    .pill{display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:600}
  .dry{background:#3a2e12;color:#f0c674}.live{background:#10331f;color:#5fd38a}
</style></head><body>
    <h1>Rate Limiting & Abuse Protection</h1>
    <div class="muted">Mode: <span class="pill ${s.dryRun ? 'dry' : 'live'}">${s.dryRun ? 'DRY-RUN' : 'LIVE'}</span>
&middot; ${s.allowlisted} allowlisted &middot; inbound ${s.config.inboundMax}/${s.config.inboundWindowSec}s</div>
  <div class="cards">
     <div class="card"><div class="n">${s.stats.http429}</div><div class="l">HTTP 429s</div></div>
     <div class="card"><div class="n">${s.stats.inboundCooldowns}</div><div class="l">Cooldowns</div></div>
     <div class="card"><div class="n">${s.stats.inboundBlocks}</div><div class="l">Auto-blocks</div></div>
     <div class="card"><div class="n">${s.activeBlocks.length}</div><div class="l">Active blocks</div></div>
    </div>
    <div class="tables">
    <div><h2>Active blocks</h2><table><thead><tr><th>ID</th><th>Type</th><th>Expires</th></tr></thead><tbody>${blockRows}
</tbody></table></div>
    <div><h2>Active cooldowns</h2><table><thead><tr><th>ID</th><th>Expires</th></tr></thead><tbody>${coolRows}</tbody>
</table></div>
  </div>
</body></html>`;
}


module.exports = { register, httpLimiter, core };
