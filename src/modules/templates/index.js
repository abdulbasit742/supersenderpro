// src/modules/templates/index.js
// Express routes + /templates dashboard for the WhatsApp Template Manager.
'use strict';

const core = require('./templates');

function register(app) {
  app.post('/api/templates/upsert', (req, res) => {
    try { res.json({ ok: true, template: core.upsert(req.body || {}) }); }
    catch (err) { res.status(400).json({ ok: false, error: String(err && err.message ? err.message : err) }); }
  });

  app.post('/api/templates/status', (req, res) => {
    const b = req.body || {};
    try { res.json({ ok: true, template: core.setStatus(b.name, b.language, b.status, b.rejectionReason) }); }
    catch (err) { res.status(400).json({ ok: false, error: String(err && err.message ? err.message : err) }); }
  });

  app.post('/api/templates/validate', (req, res) => {
    const b = req.body || {};
    res.json({ ok: true, ...core.validate(b.body, b.category) });
  });

  app.post('/api/templates/build', (req, res) => {
    const b = req.body || {};
    res.json(core.build(b.name, b.values || {}, { language: b.language }));
  });

  app.get('/api/templates/status', (_req, res) => res.json({ ok: true, ...core.getStats() }));
  app.get('/templates', (_req, res) => res.send(renderDashboard(core.getStats())));
  return { core };
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

function renderDashboard(s) {
  const color = (st) => ({ approved: '#5fd38a', pending: '#f0c674', draft: '#9ecbff', rejected: '#f08a8a' }[st] || '#8a8f98');
  const rows = s.templates.map((t) => {
    const c = color(t.status);
    const warn = (t.warnings && t.warnings.length) ? `<span class="warn" title="${escapeHtml(t.warnings.join('; '))}">⚠ ${t.warnings.length}</span>` : '';
    return `<tr>
      <td>${escapeHtml(t.name)}</td>
      <td>${escapeHtml(t.language)}</td>
      <td>${escapeHtml(t.category)}</td>
      <td>${(t.vars || []).map((v) => `<code>${escapeHtml(v)}</code>`).join(' ') || '—'}</td>
      <td><span class="pill" style="background:${c}22;color:${c}">${escapeHtml(t.status)}</span> ${warn}</td>
      <td class="reason">${escapeHtml(t.rejectionReason || '')}</td>
    </tr>`;
  }).join('') || '<tr><td colspan="6">No templates yet</td></tr>';
  return `<!doctype html><html><head><meta charset="utf-8"/><title>Templates</title>
<style>
  body{background:#0f1115;color:#e6e6e6;font:14px/1.5 system-ui,sans-serif;margin:0;padding:32px}
  h1{font-size:20px;margin:0 0 4px}.muted{color:#8a8f98;margin-bottom:24px}
  .cards{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:24px}
  .card{background:#181b22;border:1px solid #242833;border-radius:12px;padding:16px 20px;min-width:120px}
  .card .n{font-size:28px;font-weight:700}.card .l{color:#8a8f98;font-size:12px;text-transform:uppercase;letter-spacing:.04em}
  table{border-collapse:collapse;width:100%;max-width:880px;background:#181b22;border-radius:12px;overflow:hidden}
  th,td{text-align:left;padding:10px 14px;border-bottom:1px solid #242833;vertical-align:middle}th{color:#8a8f98}
  code{background:#0f1115;border:1px solid #242833;border-radius:4px;padding:1px 5px;font-size:12px;color:#9ecbff}
  .pill{display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:600}
  .warn{color:#f0c674;font-size:12px;margin-left:6px;cursor:help}.reason{color:#f08a8a;font-size:12px}
</style></head><body>
  <h1>WhatsApp Template Manager</h1>
  <div class="muted">Cloud API compliant &middot; only approved templates can be built/sent</div>
  <div class="cards">
    <div class="card"><div class="n">${s.total}</div><div class="l">Templates</div></div>
    <div class="card"><div class="n">${s.byStatus.approved || 0}</div><div class="l">Approved</div></div>
    <div class="card"><div class="n">${s.byStatus.pending || 0}</div><div class="l">Pending</div></div>
    <div class="card"><div class="n">${s.byStatus.rejected || 0}</div><div class="l">Rejected</div></div>
  </div>
  <table><thead><tr><th>Name</th><th>Lang</th><th>Category</th><th>Variables</th><th>Status</th><th>Rejection</th></tr></thead><tbody>${rows}</tbody></table>
</body></html>`;
}

module.exports = { register, renderDashboard, core };
