// src/modules/funnel/index.js
// Express routes + /funnel dashboard for Conversion Funnel Analytics.


'use strict';

const core = require('./funnel');


function register(app) {
 app.post('/api/funnel/track', (req, res) => {
     const b = req.body || {};
     if (!b.prospect || !b.stage) return res.status(400).json({ ok: false, error: 'prospect and stage required' });
     try { res.json({ ok: true, ...core.track(b.prospect, b.stage, b.at) }); }
     catch (err) { res.status(400).json({ ok: false, error: String(err && err.message ? err.message : err) }); }
   });

   app.get('/api/funnel/report', (req, res) => {
     const opts = { allTime: req.query.allTime === 'true', windowDays: req.query.windowDays ? Number(req.query.windowDays)
: undefined };
   res.json({ ok: true, ...core.report(opts) });
   });

   app.get('/api/funnel/status', (_req, res) => res.json({ ok: true, ...core.getStats() }));


   app.get('/funnel', (_req, res) => res.send(renderDashboard(core.report())));
   return { core };
}

function renderDashboard(r) {
 const maxCount = Math.max(1, ...r.stages.map((s) => s.count));
   const bars = r.stages.map((s, i) => {
     const widthPct = Math.round((s.count / maxCount) * 100);
     const leak = r.biggestLeak && r.biggestLeak.to === s.stage;
     const dropNote = i === 0 ? '' : `<span class="drop ${leak ? 'leak' : ''}">-${s.dropOff}%${leak ? ' ← biggest leak' :
''}</span>`;
   return `<div class="row">
         <div class="label">${s.stage.replace(/_/g, ' ')}</div>
         <div class="track"><div class="barfill" style="width:${widthPct}%">${s.count}</div></div>
       <div class="meta">${s.ofTop}% of top ${dropNote}</div>
     </div>`;
   }).join('');
   return `<!doctype html><html><head><meta charset="utf-8"/><title>Funnel</title>
<style>
 body{background:#0f1115;color:#e6e6e6;font:14px/1.5 system-ui,sans-serif;margin:0;padding:32px}
   h1{font-size:20px;margin:0 0 4px}.muted{color:#8a8f98;margin-bottom:24px}
   .cards{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:24px}
   .card{background:#181b22;border:1px solid #242833;border-radius:12px;padding:16px 20px;min-width:150px}
   .card .n{font-size:24px;font-weight:700}.card .l{color:#8a8f98;font-size:12px;text-transform:uppercase;letter-spacing:.04em}
 .card.hl .n{color:#5fd38a}


    .funnel{max-width:720px}
    .row{display:flex;align-items:center;gap:14px;margin-bottom:10px}
    .label{width:130px;text-transform:capitalize;color:#cfd3da;font-size:13px;text-align:right}
    .track{flex:1;background:#13161c;border-radius:8px;overflow:hidden;height:34px;display:flex;align-items:center}
    .barfill{background:linear-gradient(90deg,#3a72d4,#5fd38a);height:100%;display:flex;align-items:center;justify-
content:flex-end;padding-right:10px;color:#fff;font-weight:700;font-size:13px;border-radius:8px;min-width:28px}
  .meta{width:180px;font-size:12px;color:#8a8f98}
  .drop{color:#f0c674;margin-left:6px}.drop.leak{color:#f08a8a;font-weight:600}
</style></head><body>
    <h1>Conversion Funnel</h1>
    <div class="muted">Last ${r.windowDays || 'all'} days &middot; ${r.totalProspects} prospects in</div>
    <div class="cards">
      <div class="card hl"><div class="n">${r.overallConversion}%</div><div class="l">Lead → paid</div></div>
     <div class="card"><div class="n">${r.totalProspects}</div><div class="l">Prospects</div></div>
     <div class="card"><div class="n">${r.paid}</div><div class="l">Paid</div></div>
    <div class="card"><div class="n">${r.biggestLeak ? r.biggestLeak.dropOffPct + '%' : '-'}</div><div class="l">Biggest
leak</div></div>
    </div>
    <div class="funnel">${bars}</div>
  ${r.biggestLeak ? `<p class="muted" style="margin-top:18px">Biggest leak: <strong>${r.biggestLeak.dropped}</strong>
prospects lost between <strong>${r.biggestLeak.from.replace(/_/g,' ')}</strong> and
<strong>${r.biggestLeak.to.replace(/_/g,' ')}</strong>. Fix this step first.</p>` : ''}
</body></html>`;
}

module.exports = { register, renderDashboard, core };
