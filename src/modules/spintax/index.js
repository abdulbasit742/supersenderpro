// src/modules/spintax/index.js
// Express routes + /spintax dashboard (live preview + variation count).


'use strict';

const core = require('./spintax');


function register(app) {
 app.post('/api/spintax/spin', (req, res) => {
    const b = req.body || {};
    if (b.text == null) return res.status(400).json({ ok: false, error: 'text required' });
     res.json({ ok: true, result: core.spin(b.text, { seed: b.seed, microVary: b.microVary }) });
   });

   app.post('/api/spintax/count', (req, res) => {
    const b = req.body || {};
    if (b.text == null) return res.status(400).json({ ok: false, error: 'text required' });
     res.json({ ok: true, variants: core.count(b.text) });
   });


   app.post('/api/spintax/samples', (req, res) => {
    const b = req.body || {};
    if (b.text == null) return res.status(400).json({ ok: false, error: 'text required' });
     res.json({ ok: true, variants: core.count(b.text), samples: core.samples(b.text, Number(b.n) || 5) });
   });

   app.get('/api/spintax/status', (_req, res) => res.json({ ok: true, ...core.getStats() }));


   app.get('/spintax', (_req, res) => res.send(renderDashboard(core.getStats())));
   return { core };
}

function renderDashboard(s) {
 const rows = s.templates.map((t) => `<tr><td><code>${t.key}</code></td><td>${t.variants.toLocaleString()}</td>
<td>${t.seen}</td></tr>`).join('') || '<tr><td colspan="3">No templates spun yet</td></tr>';
   // A small built-in playground that calls the API.
   return `<!doctype html><html><head><meta charset="utf-8"/><title>Spintax</title>
<style>
 body{background:#0f1115;color:#e6e6e6;font:14px/1.5 system-ui,sans-serif;margin:0;padding:32px}
   h1{font-size:20px;margin:0 0 4px}.muted{color:#8a8f98;margin-bottom:24px}
   h2{font-size:13px;color:#8a8f98;text-transform:uppercase;letter-spacing:.04em;margin:24px 0 8px}
   .cards{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:8px}
   .card{background:#181b22;border:1px solid #242833;border-radius:12px;padding:16px 20px;min-width:140px}
 .card .n{font-size:28px;font-weight:700}.card .l{color:#8a8f98;font-size:12px;text-transform:uppercase;letter-
spacing:.04em}
 textarea{width:100%;max-width:760px;height:80px;background:#181b22;border:1px solid #242833;border-
radius:10px;color:#e6e6e6;padding:12px;font:13px/1.5 ui-monospace,monospace}
 button{background:#3a72d4;color:#fff;border:0;border-radius:8px;padding:8px 16px;font-weight:600;cursor:pointer;margin-
top:8px}


    #out{margin-top:12px;max-width:760px}
  .v{background:#181b22;border:1px solid #242833;border-radius:8px;padding:8px 12px;margin-bottom:6px;font:13px/1.4 ui-
monospace,monospace}
    .count{color:#5fd38a;font-weight:600}
    table{border-collapse:collapse;width:100%;max-width:520px;background:#181b22;border-radius:12px;overflow:hidden}
    th,td{text-align:left;padding:9px 14px;border-bottom:1px solid #242833}th{color:#8a8f98}
    code{color:#9ecbff}
</style></head><body>
  <h1>Spintax Message Variation</h1>
  <div class="muted">${s.totalSpins.toLocaleString()} messages spun &middot; micro-variation ${s.config.microVary ? 'on'
: 'off'}</div>
    <div class="cards">
      <div class="card"><div class="n">${s.totalSpins.toLocaleString()}</div><div class="l">Total spins</div></div>
      <div class="card"><div class="n">${s.trackedTemplates}</div><div class="l">Templates</div></div>
    </div>
    <h2>Playground</h2>
    <textarea id="in">{Salam|Hello|Hi} {{name}}, aap ki {{tool}} {kal|1 din mein} {expire|khatam} ho rahi hai. {RENEW reply
karein|Reply RENEW}.</textarea>
  <div><button onclick="go()">Preview variations</button></div>
    <div id="out"></div>
    <h2>Most-used templates</h2>
  <table><thead><tr><th>Template</th><th>Variation space</th><th>Times used</th></tr></thead><tbody>${rows}</tbody>
</table>
    <script>
      async function go(){
       const text=document.getElementById('in').value;
       const r=await fetch('/api/spintax/samples',{method:'POST',headers:{'Content-
Type':'application/json'},body:JSON.stringify({text,n:6})});
      const j=await r.json();
       const out=document.getElementById('out');
       out.innerHTML='<div class="count">'+j.variants.toLocaleString()+' unique variations possible</div>'+ (j.samples||
[]).map(s=>'<div class=\\'v\\'>'+s.replace(/</g,'<')+'</div>').join('');
    }
  </script>
</body></html>`;
}


module.exports = { register, renderDashboard, core };
