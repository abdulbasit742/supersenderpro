// public/js/security-gateway.js — Security Gateway dashboard. Read-only / preview calls only. No secrets handled client-side.
const API = '/api/security-gateway';
const $ = (s) => document.querySelector(s);
async function get(p) { const r = await fetch(API + p); return r.json(); }
async function post(p, body) { const r = await fetch(API + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) }); return r.json(); }
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const t = (iso) => { try { return new Date(iso).toLocaleString(); } catch (_e) { return iso; } }

async function loadOverview() {
  const d = await get('/dashboard');
  const s = d.status || {}; const p = s.posture || {};
  $('#sg-posture').textContent = `dry-run: ${s.dryRun ? 'ON' : 'OFF'} · enforcement: ${p.enforcementEnabled ? 'ON' : 'OFF (default)'}`;
  const byRisk = d.eventsByRisk || {};
  const stats = [
    ['Security score', `${d.score}/100`], ['Status', d.doctorStatus || '—'], ['Policies', (s.policyCount || 0)],
    ['Rate warnings', byRisk.medium || 0], ['High-risk signals', (byRisk.high || 0) + (byRisk.critical || 0)],
    ['Dry-run', s.dryRun ? 'ON' : 'OFF'],
  ];
  $('#sg-overview-grid').innerHTML = stats.map(([k, v]) => `<div class="sg-stat"><div class="v">${esc(v)}</div><div class="k">${esc(k)}</div></div>`).join('');
}
async function loadPolicies() {
  const d = await get('/policies'); const rows = (d.policies || []).map((p) => `<tr><td>${esc(p.name)}</td><td>${esc(p.scope)}</td><td>${esc(p.targetPattern)}</td><td>${p.maxRequests}</td><td>${p.windowSeconds}</td><td>${esc(p.blockMode)}</td><td class="risk-${esc(p.severity)}">${esc(p.severity)}</td></tr>`).join('');
  $('#sg-policy-table tbody').innerHTML = rows || '<tr><td colspan="7" class="sg-muted">No policies.</td></tr>';
}
async function loadRateLimits() {
  const d = await get('/rate-limits'); const defs = d.defaults || {};
  $('#sg-rate-table tbody').innerHTML = Object.entries(defs).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${v.maxRequests}</td><td>${v.windowSeconds}</td><td>${esc(v.mode)}</td></tr>`).join('');
}
async function loadEvents() {
  const d = await get('/events?limit=50'); const rows = (d.events || []).map((e) => `<tr><td>${esc(t(e.createdAt))}</td><td>${esc(e.eventType)}</td><td class="risk-${esc(e.riskLevel)}">${esc(e.riskLevel)}</td><td>${esc(e.route)}</td><td>${esc(e.summary)}</td></tr>`).join('');
  $('#sg-events-table tbody').innerHTML = rows || '<tr><td colspan="5" class="sg-muted">No events yet.</td></tr>';
}
async function loadAbuse() {
  const d = await get('/abuse/signals'); const rows = (d.recent || []).map((r) => `<tr><td>${esc(t(r.at))}</td><td class="risk-${esc(r.riskLevel)}">${esc(r.riskLevel)}</td><td>${esc(r.scope)}</td><td>${esc(r.route)}</td><td>${esc(r.keyHashed)}</td></tr>`).join('');
  $('#sg-abuse-table tbody').innerHTML = rows || '<tr><td colspan="5" class="sg-muted">No recent signals.</td></tr>';
}
async function loadSafety() {
  const d = await get('/dashboard'); const p = (d.posture) || {};
  const items = [
    ['Raw IP disabled (hashed)', p.rawIpDisabled], ['PII redacted', p.piiRedacted], ['Secrets redacted', p.secretsRedacted],
    ['Raw export disabled', !p.rawExportAllowed], ['Enforcement disabled by default', !p.enforcementEnabled],
  ];
  $('#sg-safety-list').innerHTML = items.map(([k, ok]) => `<li><span class="${ok ? 'badge-ok' : 'badge-off'}">${ok ? '✓' : '✕'}</span> ${esc(k)}</li>`).join('');
}

document.addEventListener('click', async (e) => {
  if (e.target.id === 'rl-test-btn') { const r = await post('/rate-limits/test', { scope: $('#rl-scope').value }); $('#rl-test-out').textContent = JSON.stringify(r.result, null, 2); }
  if (e.target.id === 'abuse-sample-btn') { const r = await post('/abuse/sample-run', {}); $('#abuse-out').textContent = JSON.stringify(r.result, null, 2); loadAbuse(); loadEvents(); }
  if (e.target.id === 'events-export-btn') { const r = await post('/events/export-redacted', {}); $('#abuse-out'); alert(`Redacted export ready: ${(r.events || []).length} events. Raw export ${r.rawExport && r.rawExport.allowed ? 'enabled' : 'disabled'}.`); }
  if (e.target.dataset && e.target.dataset.validate) {
    const kind = e.target.dataset.validate; let path, body;
    if (kind === 'public-form') { path = '/validate/public-form'; body = { data: { name: 'demo', evil: '../etc' }, options: { requireConsent: true, allowedFields: ['name'] } }; }
    else if (kind === 'developer-api') { path = '/validate/developer-api'; body = { requiredScope: 'developer_api', providedScopes: ['public_api'] }; }
    else if (kind === 'webhook') { path = '/validate/webhook'; body = { payload: { event: 'test', note: 'sample' } }; }
    else { path = '/validate/tenant-access'; body = { actorTenant: 'tenantA', targetTenant: 'tenantB' }; }
    const r = await post(path, body); $('#validate-out').textContent = JSON.stringify(r.result, null, 2);
  }
});

function refresh() { loadOverview(); loadPolicies(); loadRateLimits(); loadEvents(); loadAbuse(); loadSafety(); }
refresh();
