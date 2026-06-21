// src/modules/kb/index.js
// Express routes + /knowledge-base dashboard + the ask() hook.


'use strict';

const core = require('./kb');


function register(app, deps = {}) {
 app.post('/api/kb/upsert', (req, res) => {
     try { res.json({ ok: true, ...core.upsert(req.body || {}) }); }
     catch (err) { res.status(400).json({ ok: false, error: String(err && err.message ? err.message : err) }); }
   });

   app.post('/api/kb/remove', (req, res) => {
     const id = req.body && req.body.id;
     if (!id) return res.status(400).json({ ok: false, error: 'id required' });
     res.json({ ok: true, ...core.remove(id) });
   });

   app.post('/api/kb/ask', async (req, res) => {
     const q = req.body && req.body.question;
     if (!q) return res.status(400).json({ ok: false, error: 'question required' });
     try { res.json({ ok: true, ...(await core.ask(q, deps)) }); }
     catch (err) { res.status(500).json({ ok: false, error: String(err && err.message ? err.message : err) }); }
   });

   app.get('/api/kb/search', (req, res) => res.json({ ok: true, hits: core.search(req.query.q || '',
Number(req.query.limit) || 3) }));
 app.get('/api/kb/status', (_req, res) => res.json({ ok: true, ...core.getStats() }));

   app.get('/knowledge-base', (_req, res) => res.send(renderDashboard(core.getStats())));

   return { core, api: { ask: (q) => core.ask(q, deps) } };
}

function renderDashboard(s) {
 const entryRows = s.entryList.map((e) => `<tr><td>${e.id}</td><td>${escapeHtml(e.title)}</td><td>${e.tokens}</td>
</tr>`).join('') || '<tr><td colspan="3">No KB entries yet</td></tr>';
 const missRows = s.recentMisses.map((m) => `<tr><td class="txt">${escapeHtml(m.question)}</td><td>${m.score}</td>
</tr>`).join('') || '<tr><td colspan="2">No misses - nice</td></tr>';
 return `<!doctype html><html><head><meta charset="utf-8"/><title>Knowledge Base</title>
<style>
 body{background:#0f1115;color:#e6e6e6;font:14px/1.5 system-ui,sans-serif;margin:0;padding:32px}
   h1{font-size:20px;margin:0 0 4px}.muted{color:#8a8f98;margin-bottom:24px}
   h2{font-size:13px;color:#8a8f98;text-transform:uppercase;letter-spacing:.04em;margin:24px 0 8px}
   .cards{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:8px}
   .card{background:#181b22;border:1px solid #242833;border-radius:12px;padding:16px 20px;min-width:130px}
 .card .n{font-size:28px;font-weight:700}.card .l{color:#8a8f98;font-size:12px;text-transform:uppercase;letter-spacing:.04em}


    .tables{display:flex;gap:16px;flex-wrap:wrap}
    table{border-collapse:collapse;width:100%;max-width:420px;background:#181b22;border-radius:12px;overflow:hidden}
    th,td{text-align:left;padding:9px 14px;border-bottom:1px solid #242833}th{color:#8a8f98}
  .txt{color:#cfd3da;max-width:280px}
</style></head><body>
    <h1>Knowledge Base & Auto-Answer</h1>
    <div class="muted">Deflection rate ${(s.deflectionRate * 100).toFixed(0)}% &middot; confidence floor
${s.config.minScore}</div>
  <div class="cards">
     <div class="card"><div class="n">${s.entries}</div><div class="l">KB entries</div></div>
     <div class="card"><div class="n">${s.totalAsks}</div><div class="l">Questions asked</div></div>
      <div class="card"><div class="n">${s.answered}</div><div class="l">Auto-answered</div></div>
    </div>
    <div class="tables">
      <div><h2>KB entries</h2><table><thead><tr><th>ID</th><th>Title</th><th>Terms</th></tr></thead><tbody>${entryRows}
</tbody></table></div>
    <div><h2>Recent misses (add these to KB)</h2><table><thead><tr><th>Question</th><th>Top score</th></tr></thead>
<tbody>${missRows}</tbody></table></div>
  </div>
</body></html>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

module.exports = { register, renderDashboard, core };
