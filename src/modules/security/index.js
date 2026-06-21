// src/modules/security/index.js
// Express wiring for security headers + webhook verification + /security self-check.


'use strict';

const core = require('./security');


function register(app) {
  // Apply security headers to every response (mount FIRST, before routes).
    app.use(core.securityHeaders());

    app.get('/api/security/selfcheck', (_req, res) => res.json({ ok: true, ...core.selfCheck() }));

    app.get('/security', (_req, res) => res.send(renderDashboard(core.selfCheck())));

    return {
      core,
      // expose middleware so server.js can guard webhook routes
      verifyMetaSignature: core.verifyMetaSignature,
      captureRawBody: core.captureRawBody,
    };
}


function renderDashboard(s) {
  const levelColor = (l) => l === 'P0' ? '#f08a8a' : l === 'P1' ? '#f0c674' : '#9ecbff';
    const scoreColor = s.score >= 80 ? '#5fd38a' : s.score >= 50 ? '#f0c674' : '#f08a8a';
    const issueRows = s.issues.map((i) => `<tr><td><span class="pill"


                                                              🎉
style="background:${levelColor(i.level)}22;color:${levelColor(i.level)}">${i.level}</span></td><td>${i.item}</td>
</tr>`).join('') || '<tr><td colspan="2">No issues detected   </td></tr>';
    const okRows = s.ok.map((o) => `<li>✅  ${o}</li>`).join('') || '<li>-</li>';
    return `<!doctype html><html><head><meta charset="utf-8"/><title>Security</title>
<style>
  body{background:#0f1115;color:#e6e6e6;font:14px/1.5 system-ui,sans-serif;margin:0;padding:32px}
    h1{font-size:20px;margin:0 0 4px}.muted{color:#8a8f98;margin-bottom:24px}
    h2{font-size:13px;color:#8a8f98;text-transform:uppercase;letter-spacing:.04em;margin:24px 0 8px}
    .score{display:flex;align-items:center;gap:16px;margin-bottom:24px}
    .ring{font-size:40px;font-weight:800;color:${scoreColor}}
    table{border-collapse:collapse;width:100%;max-width:680px;background:#181b22;border-radius:12px;overflow:hidden}
    th,td{text-align:left;padding:10px 14px;border-bottom:1px solid #242833}th{color:#8a8f98}
    .pill{display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:600}
    ul{list-style:none;padding:0;max-width:680px}li{background:#181b22;border:1px solid #242833;border-
radius:8px;padding:8px 12px;margin-bottom:6px}
</style></head><body>
    <h1>Security Self-Check</h1>
    <div class="muted">Runtime configuration audit. Fix P0/P1 first.</div>
  <div class="score"><div class="ring">${s.score}</div><div><div style="font-weight:700">Security score</div><div
class="muted" style="margin:0">${s.issues.length} issue(s) to address</div></div></div>
    <h2>Issues</h2>
    <table><thead><tr><th>Level</th><th>Item</th></tr></thead><tbody>${issueRows}</tbody></table>


      <h2>Passing</h2><ul>${okRows}</ul>
 </body></html>`;
 }


 module.exports = { register, core };
