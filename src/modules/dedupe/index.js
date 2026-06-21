// src/modules/dedupe/index.js
// Express routes + /dedupe dashboard for the Inbound Dedupe + Idempotency guard.


'use strict';

const core = require('./dedupe');


function register(app) {
  app.post('/api/dedupe/seen', (req, res) => {
      const b = req.body || {};
      res.json({ ok: true, ...core.seen({ id: b.id, from: b.from, body: b.body, at: b.at }) });
    });

    app.get('/api/dedupe/has-run/:key', (req, res) => res.json({ ok: true, hasRun: core.hasRun(req.params.key) }));

    app.get('/api/dedupe/status', (_req, res) => res.json({ ok: true, ...core.getStats() }));


    app.get('/dedupe', (_req, res) => res.send(renderDashboard(core.getStats())));
    return { core };
}

function renderDashboard(s) {
  const dupPct = (s.duplicateRate * 100).toFixed(1);
    const dupColor = s.duplicateRate > 0.1 ? '#f0c674' : '#5fd38a';
    return `<!doctype html><html><head><meta charset="utf-8"/><title>Dedupe</title>
<style>
  body{background:#0f1115;color:#e6e6e6;font:14px/1.5 system-ui,sans-serif;margin:0;padding:32px}
    h1{font-size:20px;margin:0 0 4px}.muted{color:#8a8f98;margin-bottom:24px}
    h2{font-size:13px;color:#8a8f98;text-transform:uppercase;letter-spacing:.04em;margin:24px 0 8px}
    .cards{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:8px}
    .card{background:#181b22;border:1px solid #242833;border-radius:12px;padding:16px 20px;min-width:140px}
  .card .n{font-size:28px;font-weight:700}.card .l{color:#8a8f98;font-size:12px;text-transform:uppercase;letter-
spacing:.04em}
  .card .s{font-size:12px;color:#8a8f98;margin-top:4px}
</style></head><body>
    <h1>Inbound Dedupe & Idempotency</h1>
    <div class="muted">Process-once guard &middot; TTL ${s.config.ttlHours}h &middot;
${s.activeFingerprints.toLocaleString()} active fingerprints</div>
  <h2>Message dedupe</h2>
    <div class="cards">
      <div class="card"><div class="n">${s.fresh.toLocaleString()}</div><div class="l">Fresh</div></div>
    <div class="card"><div class="n" style="color:${dupColor}">${s.duplicate.toLocaleString()}</div><div
class="l">Duplicates blocked</div><div class="s">${dupPct}% of inbound</div></div>
      <div class="card"><div class="n">${s.activeFingerprints.toLocaleString()}</div><div class="l">Active keys</div></div>
    </div>
    <h2>Action idempotency (once)</h2>
    <div class="cards">
      <div class="card"><div class="n">${s.onceRuns.toLocaleString()}</div><div class="l">Actions run</div></div>
      <div class="card"><div class="n">${s.onceHits.toLocaleString()}</div><div class="l">Double-fires blocked</div></div>


         <div class="card"><div class="n">${s.onceKeys.toLocaleString()}</div><div class="l">Cached keys</div></div>
   </div>
 </body></html>`;
 }

 module.exports = { register, renderDashboard, core };
