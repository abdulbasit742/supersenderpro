// public/js/tenant-isolation.js — Tenant Isolation dashboard. Read-only / preview calls; no secrets handled client-side.
const API = '/api/tenant-isolation';
const $ = (s) => document.querySelector(s);
async function get(p) { return (await fetch(API + p)).json(); }
async function post(p, b) { return (await fetch(API + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b || {}) })).json(); }
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const yn = (b) => b ? '✓' : '—';

async function loadOverview() {
  const d = await get('/dashboard');
  $('#ti-posture').textContent = `dry-run: ${d.posture && d.posture.dryRun ? 'ON' : 'OFF'} · cross-tenant: ${d.posture && d.posture.crossTenantBlocked ? 'blocked' : 'open'}`;
  const stats = [
    ['Isolation score', `${d.score}/100`], ['Status', d.doctorStatus || '—'], ['Policies', d.policyCount || 0],
    ['Sims passed', `${(d.simulations || {}).passed || 0}/${(d.simulations || {}).total || 0}`],
    ['High route risks', (d.routeRisks || {}).highRisk || 0], ['Recent leaks', (d.recentLeaks || []).length],
  ];
  $('#ti-overview').innerHTML = stats.map(([k, v]) => `<div class="ti-stat"><div class="v">${esc(v)}</div><div class="k">${esc(k)}</div></div>`).join('');
}
async function loadPolicies() {
  const d = await get('/policies');
  $('#ti-policies tbody').innerHTML = (d.policies || []).map((p) => `<tr><td>${esc(p.name)}</td><td>${esc(p.boundaryType)}</td><td>${esc((p.targetModules || []).join(', '))}</td><td class="risk-${esc(p.severity)}">${esc(p.severity)}</td><td>${yn(p.redactionRequired)}</td></tr>`).join('') || '<tr><td colspan="5" class="ti-muted">No policies.</td></tr>';
}
async function loadSafety() {
  const d = await get('/dashboard'); const p = d.posture || {};
  const items = [['Dry-run enabled', p.dryRun], ['No raw data export', !p.rawExportAllowed], ['PII redacted', p.piiRedacted], ['Secrets redacted', p.secretsRedacted], ['Cross-tenant blocked', p.crossTenantBlocked], ['Non-destructive', p.noDestructive]];
  $('#ti-safety').innerHTML = items.map(([k, ok]) => `<li><span class="${ok ? 'badge-ok' : 'badge-off'}">${ok ? '✓' : '✕'}</span> ${esc(k)}</li>`).join('');
}

document.addEventListener('click', async (e) => {
  if (e.target.id === 'ev-run') {
    const actor = $('#ev-actor').value;
    const samples = { tenant: { actorType: 'tenant', tenantId: 'T_A', targetTenantId: 'T_B', requestsPrivateData: true }, reseller: { actorType: 'reseller', resellerId: 'R1', assignedClientIds: ['C1'], targetClientId: 'C9' }, workspace_member: { actorType: 'workspace_member', workspaceId: 'W_A', targetWorkspaceId: 'W_B' }, developer_app: { actorType: 'developer_app', requiredScope: 'billing:read', providedScopes: ['public:read'] }, public: { actorType: 'public', requestsPrivateData: true } };
    const r = await post('/evaluate', samples[actor]); $('#ev-out').textContent = JSON.stringify(r.decision, null, 2);
  }
  if (e.target.id === 'leak-run') {
    let payload; try { payload = JSON.parse($('#leak-input').value || '{}'); } catch (_e) { payload = { text: $('#leak-input').value }; }
    const r = await post('/leak-detect', { payload }); $('#leak-out').textContent = JSON.stringify(r.result, null, 2);
  }
  if (e.target.id === 'route-run') { const r = await post('/scan/routes', {}); $('#ti-routes tbody').innerHTML = (r.result.routes || []).map((x) => `<tr><td>${esc(x.file)}</td><td>${esc(x.scope)}</td><td>${yn(x.authGuard)}</td><td>${yn(x.tenantGuard)}</td><td>${yn(x.redactionGuard)}</td><td class="risk-${esc(x.leakRisk)}">${esc(x.leakRisk)}</td></tr>`).join(''); }
  if (e.target.id === 'store-run') { const r = await post('/scan/stores', {}); $('#store-out').textContent = JSON.stringify(r.result, null, 2); }
  if (e.target.id === 'sim-run') { const r = await post('/simulations/run', {}); $('#ti-sims tbody').innerHTML = (r.result.results || []).map((s) => `<tr><td>${esc(s.name)}</td><td>${yn(s.expectedBlock)}</td><td>${esc(s.actualDecision)}</td><td class="pass-${s.passed ? 'yes' : 'no'}">${s.passed ? 'PASS' : 'FAIL'}</td></tr>`).join(''); }
});

function refresh() { loadOverview(); loadPolicies(); loadSafety(); }
refresh();
