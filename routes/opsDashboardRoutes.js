'use strict';
/**
 * routes/opsDashboardRoutes.js - ops admin dashboard. Mounted at /api/ops (see OPS DASHBOARD HOOK).
 * Wire: node scripts/wire-ops-dashboard.js
 *
 * /dashboard = JSON aggregate. /ui = a single self-contained HTML page (no build step) that
 * polls the JSON. Admin-guarded when an admin secret is configured.
 */
const express = require('express');
const uptime = require('../lib/observability/uptime');
const { errorTracker } = require('../lib/observability');
let H = null; try { H = require('../lib/healthCheck'); } catch {}
let billing = null; try { billing = require('../lib/billing'); } catch {}

const router = express.Router();
function adminGuard(req, res, next) {
  const configured = process.env.ADMIN_TOKEN || process.env.CHANNEL_ADMIN_SECRET || '';
  if (!configured) return next();
  const provided = req.get('x-admin-secret') || req.query.secret;
  if (provided && provided === configured) return next();
  if (req.path === '/ui') return next(); // UI shell is public; data calls still guarded
  return res.status(401).json({ success: false, error: 'Unauthorized' });
}

router.get('/dashboard', adminGuard, async (req, res) => {
  let health = null;
  try { health = H ? await H.getHealth({}) : null; } catch (e) { health = { status: 'unknown', error: e.message }; }
  let plans = null;
  try { plans = billing ? billing.plans.getPlans().map((p) => ({ id: p.id, name: p.name })) : null; } catch {}
  res.json({
    success: true,
    generatedAt: new Date().toISOString(),
    health,
    uptime: uptime.summary(),
    errors: { stats: errorTracker.stats(), recent: errorTracker.recent(10) },
    plans,
  });
});

router.get('/ui', adminGuard, (req, res) => {
  res.set('Content-Type', 'text/html');
  res.send(DASHBOARD_HTML);
});

const DASHBOARD_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SuperSender Ops</title>
<style>
:root{--bg:#0b1020;--card:#151b30;--ok:#22c55e;--warn:#f59e0b;--down:#ef4444;--muted:#8b94b3;--text:#e6e9f5}
*{box-sizing:border-box}body{margin:0;font-family:system-ui,Segoe UI,Arial,sans-serif;background:var(--bg);color:var(--text)}
header{padding:18px 24px;border-bottom:1px solid #222a45;display:flex;align-items:center;gap:12px}
h1{font-size:18px;margin:0}.dot{width:12px;height:12px;border-radius:50%;background:var(--muted)}
.wrap{padding:24px;display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;max-width:1100px}
.card{background:var(--card);border:1px solid #222a45;border-radius:14px;padding:18px}
.card h2{font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin:0 0 10px}
.big{font-size:30px;font-weight:700}.row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #1d2440;font-size:14px}
.row:last-child{border:0}.pill{padding:2px 10px;border-radius:999px;font-size:12px;font-weight:600}
.s-ok{background:rgba(34,197,94,.15);color:var(--ok)}.s-degraded{background:rgba(245,158,11,.15);color:var(--warn)}.s-down,.s-unknown{background:rgba(239,68,68,.15);color:var(--down)}
.muted{color:var(--muted);font-size:12px}code{background:#0e1426;padding:2px 6px;border-radius:6px}
.err{font-size:12px;border-bottom:1px solid #1d2440;padding:6px 0;color:#f2b8b8}
</style></head><body>
<header><span id="hdot" class="dot"></span><h1>SuperSender Ops Dashboard</h1><span id="ts" class="muted" style="margin-left:auto"></span></header>
<div class="wrap">
  <div class="card"><h2>Health</h2><div id="health" class="big">...</div><div id="checks" class="muted"></div></div>
  <div class="card"><h2>Uptime</h2><div id="uptime" class="big">...</div><div id="uptimeMeta" class="muted"></div></div>
  <div class="card"><h2>Errors (buffer)</h2><div id="errCount" class="big">...</div><div id="errList"></div></div>
  <div class="card"><h2>Plans</h2><div id="plans" class="muted"></div></div>
  <div class="card"><h2>Recent incidents</h2><div id="incidents" class="muted"></div></div>
</div>
<script>
const secret = new URLSearchParams(location.search).get('secret');
const hdrs = secret ? { 'x-admin-secret': secret } : {};
function cls(s){return 's-'+(s||'unknown');}
async function tick(){
  try{
    const r = await fetch('/api/ops/dashboard'+(secret?('?secret='+encodeURIComponent(secret)):''),{headers:hdrs});
    const d = await r.json();
    document.getElementById('ts').textContent = new Date(d.generatedAt).toLocaleTimeString();
    const hs = (d.health&&d.health.status)||'unknown';
    const he = document.getElementById('health'); he.innerHTML = '<span class="pill '+cls(hs)+'">'+hs.toUpperCase()+'</span>';
    document.getElementById('hdot').style.background = hs==='ok'?'var(--ok)':(hs==='degraded'?'var(--warn)':'var(--down)');
    document.getElementById('checks').textContent = d.health&&d.health.checks?Object.keys(d.health.checks).map(k=>k+':'+d.health.checks[k].status).join('  '):'';
    const u = d.uptime||{};
    document.getElementById('uptime').textContent = (u.uptimePct==null?'-':u.uptimePct+'%');
    document.getElementById('uptimeMeta').textContent = (u.samples||0)+' samples · current '+(u.currentStatus||'?');
    document.getElementById('errCount').textContent = (d.errors&&d.errors.stats?d.errors.stats.buffered:0);
    document.getElementById('errList').innerHTML = (d.errors&&d.errors.recent||[]).slice(0,5).map(e=>'<div class="err">'+(e.message||'')+'</div>').join('')||'<div class="muted">none</div>';
    document.getElementById('plans').innerHTML = (d.plans||[]).map(p=>'<div class="row"><span>'+p.name+'</span><code>'+p.id+'</code></div>').join('')||'n/a';
    document.getElementById('incidents').innerHTML = (u.incidents||[]).slice(0,6).map(i=>'<div class="row"><span>'+i.from+' -> '+i.to+'</span><span class="muted">'+new Date(i.at).toLocaleTimeString()+'</span></div>').join('')||'<div class="muted">no incidents</div>';
  }catch(e){ document.getElementById('health').textContent='dashboard error'; }
}
tick(); setInterval(tick, 5000);
</script></body></html>`;

module.exports = router;
