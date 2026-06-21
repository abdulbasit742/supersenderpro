// src/modules/abtest/index.js
// Express routes + /ab-tests dashboard for the Message A/B Testing module.
'use strict';

const core = require('./abtest');

function register(app) {
  app.post('/api/ab-tests/define', (req, res) => {
    const b = req.body || {};
    try { res.json({ ok: true, experiment: core.defineExperiment(b.id, b.variants) }); }
    catch (err) { res.status(400).json({ ok: false, error: String(err && err.message ? err.message : err) }); }
  });

  app.post('/api/ab-tests/assign', (req, res) => {
    const b = req.body || {};
    try { res.json({ ok: true, ...core.assign(b.id, b.customerNumber) }); }
    catch (err) { res.status(400).json({ ok: false, error: String(err && err.message ? err.message : err) }); }
  });

  app.post('/api/ab-tests/sent', (req, res) => {
    const b = req.body || {};
    res.json({ ok: true, ...(core.recordSent(b.id, b.customerNumber) || {}) });
  });

  app.post('/api/ab-tests/convert', (req, res) => {
    const b = req.body || {};
    res.json({ ok: true, ...(core.recordConversion(b.id, b.customerNumber) || {}) });
  });

  app.get('/api/ab-tests/results/:id', (req, res) => res.json({ ok: true, ...core.results(req.params.id) }));
  app.get('/api/ab-tests/status', (_req, res) => res.json({ ok: true, experiments: core.listExperiments() }));
  app.get('/ab-tests', (_req, res) => res.send(renderDashboard(core.listExperiments())));
  return { core };
}

function renderDashboard(experiments) {
  const confColor = (c) => ({ significant: '#5fd38a', promising: '#f0c674', low: '#8a8f98', control: '#9ecbff' }[c] || '#8a8f98');
  const upliftColor = (u) => u > 0 ? '#5fd38a' : u < 0 ? '#f08a8a' : '#8a8f98';
  const blocks = experiments.map((e) => {
    if (!e.found) return '';
    const rows = e.variants.map((v) => {
      const star = v.id === e.bestVariantId ? ' ⭐' : '';
      return `<tr>
        <td>${v.id}${v.isControl ? ' <span class="tag">control</span>' : ''}${star}</td>
        <td class="txt">${escapeHtml(v.text).slice(0, 60)}</td>
        <td>${v.sends}</td>
        <td>${v.conversions}</td>
        <td>${v.rate}%</td>
        <td style="color:${upliftColor(v.uplift)}">${v.isControl ? '—' : (v.uplift > 0 ? '+' : '') + v.uplift + '%'}</td>
        <td><span class="pill" style="background:${confColor(v.confidence)}22;color:${confColor(v.confidence)}">${v.confidence}</span></td>
      </tr>`;
    }).join('');
    return `<div class="panel">
      <div class="phead"><h2>${e.id}</h2><span class="muted">${e.enoughData ? 'enough data' : 'collecting...'}</span></div>
      <table><thead><tr><th>Variant</th><th>Copy</th><th>Sends</th><th>Conv</th><th>Rate</th><th>Uplift</th><th>Confidence</th></tr></thead><tbody>${rows}</tbody></table>
    </div>`;
  }).join('') || '<div class="muted">No experiments defined yet.</div>';
  return `<!doctype html><html><head><meta charset="utf-8"/><title>A/B Tests</title>
<style>
  body{background:#0f1115;color:#e6e6e6;font:14px/1.5 system-ui,sans-serif;margin:0;padding:32px}
  h1{font-size:20px;margin:0 0 16px}.muted{color:#8a8f98;font-size:12px}
  .panel{background:#181b22;border:1px solid #242833;border-radius:12px;padding:16px 20px;margin-bottom:20px;max-width:900px}
  .phead{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:10px}
  h2{font-size:15px;margin:0}
  table{border-collapse:collapse;width:100%}
  th,td{text-align:left;padding:8px 12px;border-bottom:1px solid #242833;font-size:13px}th{color:#8a8f98;font-weight:600}
  .txt{color:#cfd3da;max-width:240px}
  .tag{font-size:10px;color:#9ecbff;border:1px solid #2c3a55;border-radius:4px;padding:0 5px;margin-left:4px}
  .pill{display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:600}
</style></head><body>
  <h1>Message A/B Testing & Uplift</h1>
  ${blocks}
</body></html>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

module.exports = { register, renderDashboard, core };
