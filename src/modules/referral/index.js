// src/modules/referral/index.js
// Express routes + /referrals dashboard for the Referral Engine.


'use strict';

const core = require('./referral');


function register(app, deps = {}) {
 app.post('/api/referrals/code', (req, res) => {
     const num = req.body && req.body.customerNumber;
     if (!num) return res.status(400).json({ ok: false, error: 'customerNumber required' });
     res.json({ ok: true, code: core.getOrCreateCode(num) });
   });

   app.post('/api/referrals/redeem', (req, res) => {
     const b = req.body || {};
     if (!b.customerNumber || !b.code) return res.status(400).json({ ok: false, error: 'customerNumber and code required'
});
     res.json(core.redeem(b.customerNumber, b.code));
   });

   app.post('/api/referrals/convert', (req, res) => {
     const num = req.body && req.body.customerNumber;
     if (!num) return res.status(400).json({ ok: false, error: 'customerNumber required' });
     res.json(core.confirmConversion(num, deps));
   });

   app.get('/api/referrals/status', (_req, res) => res.json({ ok: true, ...core.getStats() }));


   app.get('/referrals', (_req, res) => res.send(renderDashboard(core.getStats())));
   return { core };
}

function renderDashboard(s) {
 const color = (st) => ({ issued: '#9ecbff', redeemed: '#f0c674', converted: '#5fd38a', rewarded: '#5fd38a', rejected:
'#f08a8a' }[st] || '#8a8f98');
 const mask = (num) => String(num).replace(/.(?=.{4})/g, '•');
   const statusRows = Object.entries(s.byStatus || {})
     .map(([k, v]) => `<tr><td><span class="dot" style="background:${color(k)}"></span>${k}</td><td>${v}</td>
</tr>`).join('') || '<tr><td colspan="2">No referrals yet</td></tr>';
 const leaderRows = s.leaderboard.map((l, i) => `<tr><td>#${i + 1}</td><td>${mask(l.referrer)}</td><td>${l.conversions}
</td></tr>`).join('') || '<tr><td colspan="3">No conversions yet</td></tr>';
 return `<!doctype html><html><head><meta charset="utf-8"/><title>Referrals</title>
<style>
 body{background:#0f1115;color:#e6e6e6;font:14px/1.5 system-ui,sans-serif;margin:0;padding:32px}
   h1{font-size:20px;margin:0 0 4px}.muted{color:#8a8f98;margin-bottom:24px}
   h2{font-size:13px;color:#8a8f98;text-transform:uppercase;letter-spacing:.04em;margin:24px 0 8px}
   .cards{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:8px}
   .card{background:#181b22;border:1px solid #242833;border-radius:12px;padding:16px 20px;min-width:130px}


    .card .n{font-size:28px;font-weight:700}.card .l{color:#8a8f98;font-size:12px;text-transform:uppercase;letter-spacing:.04em}
  .tables{display:flex;gap:16px;flex-wrap:wrap}
    table{border-collapse:collapse;width:100%;max-width:360px;background:#181b22;border-radius:12px;overflow:hidden}
    th,td{text-align:left;padding:9px 14px;border-bottom:1px solid #242833}th{color:#8a8f98}
    .dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:8px}
    .pill{display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:600}
  .dry{background:#3a2e12;color:#f0c674}.live{background:#10331f;color:#5fd38a}
</style></head><body>
    <h1>Referral Engine</h1>
    <div class="muted">Mode: <span class="pill ${s.config.dryRun ? 'dry' : 'live'}">${s.config.dryRun ? 'DRY-RUN' : 'LIVE'}
</span> &middot; reward: ${core._internal.rewardLabel()}</div>
  <div class="cards">
      <div class="card"><div class="n">${s.totalCodes}</div><div class="l">Codes issued</div></div>
      <div class="card"><div class="n">${s.byStatus.converted || 0}</div><div class="l">Converted</div></div>
      <div class="card"><div class="n">${s.rewardsGranted}</div><div class="l">Rewards granted</div></div>
      <div class="card"><div class="n">${s.rewardsQueued}</div><div class="l">Rewards queued</div></div>
    </div>
    <div class="tables">
    <div><h2>By status</h2><table><thead><tr><th>Status</th><th>Count</th></tr></thead><tbody>${statusRows}</tbody>
</table></div>
    <div><h2>Top referrers</h2><table><thead><tr><th>#</th><th>Referrer</th><th>Conversions</th></tr></thead>
<tbody>${leaderRows}</tbody></table></div>
  </div>
</body></html>`;
}


module.exports = { register, renderDashboard, core };
