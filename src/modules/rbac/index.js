// src/modules/rbac/index.js
// Express routes + requirePermission middleware + /rbac dashboard.


'use strict';

const core = require('./rbac');


function register(app) {
  app.post('/api/rbac/actor', (req, res) => {
      // Managing actors is owner-only; identify caller via API key header.
      const caller = req.headers[core.CONFIG.apiKeyHeader];
    if (!core.guard(caller, 'rbac.manage', { op: 'setActor' })) return res.status(403).json({ ok: false, error:
'forbidden' });
      try { res.json({ ok: true, actor: redact(core.setActor(req.body || {})) }); }
      catch (err) { res.status(400).json({ ok: false, error: String(err && err.message ? err.message : err) }); }
    });


    app.post('/api/rbac/actor/remove', (req, res) => {
      const caller = req.headers[core.CONFIG.apiKeyHeader];
    if (!core.guard(caller, 'rbac.manage', { op: 'removeActor' })) return res.status(403).json({ ok: false, error:
'forbidden' });
      const id = req.body && req.body.id;
      if (!id) return res.status(400).json({ ok: false, error: 'id required' });
      res.json({ ok: true, ...core.removeActor(id) });
    });

    app.get('/api/rbac/can', (req, res) => {
      res.json({ ok: true, allowed: core.can(req.query.actor, req.query.permission) });
    });

    app.get('/api/rbac/audit', (_req, res) => {
      const s = core.getStats();
      res.json({ ok: true, entries: s.recentAudit, total: s.auditEntries });
    });

    app.get('/api/rbac/status', (_req, res) => res.json({ ok: true, ...core.getStats() }));

    app.get('/rbac', (_req, res) => res.send(renderDashboard(core.getStats())));
    return { core };
}


// Never leak API keys in API responses.
function redact(actor) { const { apiKey, ...rest } = actor || {}; return { ...rest, apiKey: apiKey ? apiKey.slice(0, 6) +
'...' : null }; }

// Express middleware factory: gate a route by a permission.
// Identifies the actor from the API key header (dashboard/API) or req.actorId.
function requirePermission(permission) {
  return function (req, res, next) {


     const actor = req.headers[core.CONFIG.apiKeyHeader] || req.actorId || (req.body && req.body._actor);
     const allowed = core.guard(actor, permission, { path: req.path, method: req.method });
     if (allowed) return next();
     return res.status(403).json({ ok: false, error: `forbidden: requires ${permission}` });
   };
}


function renderDashboard(s) {
 const roleColor = (r) => ({ owner: '#f0c674', manager: '#5fd38a', support: '#9ecbff', viewer: '#8a8f98' }[r] ||
'#8a8f98');
 const mask = (id) => String(id).replace(/.(?=.{4})/g, '•');
 const actorRows = s.actors.map((a) => `<tr><td>${a.name}</td><td>${mask(a.id)}</td><td><span class="pill"
style="background:${roleColor(a.role)}22;color:${roleColor(a.role)}">${a.role}</span></td></tr>`).join('') || '<tr><td\ncolspan="3">No actors yet</td></tr>';
 const auditRows = s.recentAudit.map((e) => `<tr>
     <td>${new Date(e.at).toISOString().slice(5, 16).replace('T', ' ')}</td>
     <td>${e.actorName}</td>
     <td>${e.action}</td>
     <td>${resultBadge(e.result)}</td>
   </tr>`).join('') || '<tr><td colspan="4">No audit entries</td></tr>';
   return `<!doctype html><html><head><meta charset="utf-8"/><title>RBAC</title>
<style>
 body{background:#0f1115;color:#e6e6e6;font:14px/1.5 system-ui,sans-serif;margin:0;padding:32px}
   h1{font-size:20px;margin:0 0 4px}.muted{color:#8a8f98;margin-bottom:24px}
   h2{font-size:13px;color:#8a8f98;text-transform:uppercase;letter-spacing:.04em;margin:24px 0 8px}
   .cards{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:8px}
   .card{background:#181b22;border:1px solid #242833;border-radius:12px;padding:16px 20px;min-width:130px}
 .card .n{font-size:24px;font-weight:700}.card .l{color:#8a8f98;font-size:12px;text-transform:uppercase;letter-
spacing:.04em}
   .tables{display:flex;gap:16px;flex-wrap:wrap}
   table{border-collapse:collapse;width:100%;max-width:440px;background:#181b22;border-radius:12px;overflow:hidden}
   th,td{text-align:left;padding:9px 14px;border-bottom:1px solid #242833}th{color:#8a8f98}
   .pill{display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:600}
   .b-allow{color:#5fd38a}.b-deny{color:#f08a8a}.b-warn{color:#f0c674}
   .mode{display:inline-block;padding:2px 10px;border-radius:999px;font-size:12px;font-weight:600}
 .enf{background:#10331f;color:#5fd38a}.log{background:#3a2e12;color:#f0c674}
</style></head><body>
   <h1>Role-Based Access & Audit</h1>
   <div class="muted">Mode: <span class="mode ${s.enforce ? 'enf' : 'log'}">${s.enforce ? 'ENFORCING' : 'LOG-ONLY'}</span>
&middot; ${s.actors.length} actors &middot; ${s.auditEntries} audit entries</div>
 <div class="cards">
     <div class="card"><div class="n">${s.byRole.owner || 0}</div><div class="l">Owners</div></div>
     <div class="card"><div class="n">${s.byRole.manager || 0}</div><div class="l">Managers</div></div>
     <div class="card"><div class="n">${s.byRole.support || 0}</div><div class="l">Support</div></div>
     <div class="card"><div class="n">${s.recentDenials.length}</div><div class="l">Recent denials</div></div>
   </div>
   <div class="tables">
   <div><h2>Actors</h2><table><thead><tr><th>Name</th><th>ID</th><th>Role</th></tr></thead><tbody>${actorRows}</tbody>
</table></div>
   <div><h2>Recent audit</h2><table><thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Result</th></tr></thead>
<tbody>${auditRows}</tbody></table></div>
 </div>
</body></html>`;
}


function resultBadge(r) {
 if (r === 'allow' || r === 'ok') return '<span class="b-allow">allow</span>';


     if (r === 'deny') return '<span class="b-deny">deny</span>';
     if (r && r.startsWith('warn')) return '<span class="b-warn">would-deny</span>';
     return r;
 }


 module.exports = { register, requirePermission, core };
