// src/modules/tenant/index.js
// Express routes (tenant CRUD + channel mapping) + /tenants admin dashboard.


'use strict';

const core = require('./tenant');


function register(app) {
  app.post('/api/tenants', (req, res) => {
      try { res.json({ ok: true, tenant: core.createTenant(req.body || {}) }); }
      catch (err) { res.status(400).json({ ok: false, error: String(err && err.message ? err.message : err) }); }
    });

    app.patch('/api/tenants/:id', (req, res) => {
      try { res.json({ ok: true, tenant: core.updateTenant(req.params.id, req.body || {}) }); }
      catch (err) { res.status(400).json({ ok: false, error: String(err && err.message ? err.message : err) }); }
    });

    app.post('/api/tenants/:id/channel', (req, res) => {
      const b = req.body || {};
      if (!b.channel || !b.account) return res.status(400).json({ ok: false, error: 'channel and account required' });
      try { res.json({ ok: true, ...core.mapChannel(req.params.id, b.channel, b.account) }); }
      catch (err) { res.status(400).json({ ok: false, error: String(err && err.message ? err.message : err) }); }
    });

    app.get('/api/tenants/:id', (req, res) => {
      const t = core.getTenant(req.params.id);
      if (!t) return res.status(404).json({ ok: false, error: 'not found' });
      res.json({ ok: true, tenant: t, plan: core.planOf(t) });
    });

    app.get('/api/tenants', (_req, res) => res.json({ ok: true, ...core.getStats() }));

    app.get('/tenants', (_req, res) => res.send(renderDashboard(core.getStats())));
    return { core };
}

function renderDashboard(s) {
  const planColor = (p) => ({ starter: '#9ecbff', growth: '#5fd38a', scale: '#f0c674' }[p] || '#8a8f98');
    const statusColor = (st) => st === 'active' ? '#5fd38a' : '#f08a8a';
    const rows = s.tenants.map((t) => `<tr>
      <td>${t.name} <span class="id">${t.id}</span></td>
      <td><span class="pill" style="background:${planColor(t.plan)}22;color:${planColor(t.plan)}">${t.plan}</span></td>
      <td><span class="dot" style="background:${statusColor(t.status)}"></span>${t.status}</td>
      <td>${t.channels}</td>
      <td>${t.msgsToday}</td>
    </tr>`).join('') || '<tr><td colspan="5">No tenants yet</td></tr>';
  const planRows = Object.entries(s.plans).map(([name, p]) => `<tr><td>${name}</td><td>${p.maxNumbers}</td>
<td>${p.msgsPerDay === null || p.msgsPerDay === Infinity ? '∞' : p.msgsPerDay}</td><td>${p.modules.includes('*') ? 'all'


 : p.modules.length + ' modules'}</td></tr>`).join('');
   return `<!doctype html><html><head><meta charset="utf-8"/><title>Tenants</title>
 <style>
     body{background:#0f1115;color:#e6e6e6;font:14px/1.5 system-ui,sans-serif;margin:0;padding:32px}
     h1{font-size:20px;margin:0 0 4px}.muted{color:#8a8f98;margin-bottom:24px}
     h2{font-size:13px;color:#8a8f98;text-transform:uppercase;letter-spacing:.04em;margin:24px 0 8px}
     .cards{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:8px}
     .card{background:#181b22;border:1px solid #242833;border-radius:12px;padding:16px 20px;min-width:130px}
     .card .n{font-size:28px;font-weight:700}.card .l{color:#8a8f98;font-size:12px;text-transform:uppercase;letter-
 spacing:.04em}
   .tables{display:flex;gap:16px;flex-wrap:wrap}
     table{border-collapse:collapse;width:100%;max-width:520px;background:#181b22;border-radius:12px;overflow:hidden}
     th,td{text-align:left;padding:9px 14px;border-bottom:1px solid #242833}th{color:#8a8f98}
     .id{color:#8a8f98;font-size:12px;margin-left:6px}
     .dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:8px}
   .pill{display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:600}
 </style></head><body>
     <h1>Multi-Tenant Admin</h1>
     <div class="muted">Multi-tenant ${s.enabled ? 'ON' : 'OFF (single-tenant)'} &middot; ${s.totalTenants} businesses on
 this platform</div>
   <div class="cards">
      <div class="card"><div class="n">${s.totalTenants}</div><div class="l">Tenants</div></div>
      <div class="card"><div class="n">${s.active}</div><div class="l">Active</div></div>
      <div class="card"><div class="n">${s.byPlan.scale || 0}</div><div class="l">Scale plan</div></div>
      <div class="card"><div class="n">${s.byPlan.growth || 0}</div><div class="l">Growth plan</div></div>
     </div>
     <div class="tables">
     <div><h2>Tenants</h2><table><thead><tr><th>Business</th><th>Plan</th><th>Status</th><th>Channels</th><th>Msgs
 today</th></tr></thead><tbody>${rows}</tbody></table></div>
     <div><h2>Plans</h2><table><thead><tr><th>Plan</th><th>Numbers</th><th>Msgs/day</th><th>Modules</th></tr></thead>
 <tbody>${planRows}</tbody></table></div>
   </div>
 </body></html>`;
 }

 module.exports = { register, renderDashboard, core };
