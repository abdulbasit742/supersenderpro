// public/js/saas-billing.js — Frontend for the SaaS Billing Command Center. Calls /api/saas-billing/*.
// Read-only by default. Admin writes send x-admin-secret if a secret is saved in the field.
const API = '/api/saas-billing';
const ADMIN_SECRET = () => sessionStorage.getItem('saasBillingAdminSecret') || '';

async function api(path, method = 'GET', body) {
  const headers = { 'Content-Type': 'application/json' };
  const sec = ADMIN_SECRET(); if (sec) headers['x-admin-secret'] = sec;
  try {
    const r = await fetch(API + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    return await r.json();
  } catch (e) { return { success: false, error: e.message }; }
}
const $ = (s) => document.querySelector(s);
const money = (n, c = 'PKR') => `${c} ${Number(n || 0).toLocaleString()}`;
const lvlChip = (l) => `<span class="chip ${l === 'exceeded' || l === 'bad' ? 'bad' : l === 'warning' || l === 'warn' ? 'warn' : l === 'ok' || l === 'healthy' ? 'ok' : 'mut'}">${l}</span>`;
const stChip = (s) => { const ok = ['active', 'lifetime', 'paid', 'healthy'].includes(s); const warn = ['trial', 'grace', 'issued', 'draft', 'warn', 'past_due'].includes(s); return `<span class="chip ${ok ? 'ok' : warn ? 'warn' : 'bad'}">${s}</span>`; };

let PLANS = [];

const App = {
  async init() {
    document.querySelectorAll('.sb-tab').forEach((t) => t.addEventListener('click', () => App.tab(t.dataset.tab)));
    await this.loadStatus();
    PLANS = ((await api('/plans')).plans) || [];
    this.fillPlanSelects();
    this.fillFeatureSelect();
    this.bind();
    this.overview();
    this.plans();
  },
  tab(name) {
    document.querySelectorAll('.sb-tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
    document.querySelectorAll('.sb-section').forEach((s) => s.classList.toggle('active', s.id === 'tab-' + name));
    if (name === 'tenants') this.tenants();
    if (name === 'usage') this.usage();
    if (name === 'invoices') this.invoices();
    if (name === 'resellers') this.resellers();
    if (name === 'doctor') this.doctor();
  },
  async loadStatus() {
    const s = (await api('/status')).status || {};
    const live = s.safety && s.safety.liveEnforcement;
    const pill = $('#sb-pill');
    pill.textContent = live ? 'Live enforcement ON' : 'Warn-only · Dry-run · Safe';
    pill.classList.toggle('live', !!live);
    if (s.safety) {
      const b = $('#sb-banner');
      b.style.display = 'block';
      b.textContent = `Posture — dryRun: ${s.safety.dryRun} · warnOnly: ${s.safety.warnOnly} · enforceLimits: ${s.safety.enforceLimits} · liveSuspension: ${s.safety.liveSuspension} · autoVerify: ${s.safety.liveAutoVerify}`;
    }
  },
  fillPlanSelects() {
    const opts = PLANS.map((p) => `<option value="${p.id}">${p.name} (${p.id})</option>`).join('');
    ['#pl-select', '#tn-plan', '#in-plan'].forEach((sel) => { if ($(sel)) $(sel).innerHTML = opts; });
  },
  fillFeatureSelect() {
    const feats = PLANS.length ? Object.keys(PLANS[0].features) : [];
    if ($('#fg-feature')) $('#fg-feature').innerHTML = feats.map((f) => `<option>${f}</option>`).join('');
  },

  async overview() {
    const s = (await api('/status')).status || {};
    const c = s.cards || {};
    const cards = [
      ['Active tenants', c.activeTenants], ['Trials', c.trials], ['Past due', c.pastDue],
      ['Revenue draft', money(c.monthlyRevenueDraft, s.currency)], ['Invoices due', c.invoicesDue],
      ['Usage over limits', c.usageOverLimits], ['Usage warnings', c.usageWarnings],
    ];
    $('#ov-cards').innerHTML = cards.map(([l, n]) => `<div class="sb-stat"><div class="n">${n ?? 0}</div><div class="l">${l}</div></div>`).join('');
    $('#ov-tenants tbody').innerHTML = (s.tenants || []).map((t) =>
      `<tr><td>${t.tenantId}</td><td>${t.planName}</td><td>${stChip(t.licenseStatus)}</td><td>${lvlChip(t.usageLevel)}</td><td>${t.openInvoices} (${money(t.openInvoiceAmount, t.currency)})</td></tr>`).join('') || '<tr><td colspan="5" class="muted">No tenants yet.</td></tr>';
  },

  async plans() {
    $('#pl-table tbody').innerHTML = PLANS.map((p) => {
      const on = Object.values(p.features).filter(Boolean).length;
      return `<tr><td>${p.id}</td><td>${p.name}</td><td>${p.tier}</td><td>${money(p.price, p.currency)}</td><td>${p.billingCycle}</td><td>${p.trialDays}d</td><td>${on}</td><td>${p.isActive ? '✅' : '⛔'}</td></tr>`;
    }).join('');
    const show = () => { const p = PLANS.find((x) => x.id === $('#pl-select').value); $('#pl-detail').textContent = JSON.stringify(p, null, 2); };
    $('#pl-select').onchange = show; show();
  },

  async tenants() {
    const list = (await api('/tenants')).tenants || [];
    const rows = await Promise.all(list.map(async (t) => {
      const lic = (await api(`/tenants/${encodeURIComponent(t.tenantId)}/license`)).license;
      return `<tr><td>${t.tenantId}</td><td>${t.planId}</td><td>${stChip(lic ? lic.status : 'none')}</td><td>${lic ? (lic.entitled ? '✅' : '❌') : '—'}</td><td>${lic && lic.expiresAt ? lic.expiresAt.slice(0, 10) : '—'}</td><td>${lic && lic.renewalDueAt ? lic.renewalDueAt.slice(0, 10) : '—'}</td></tr>`;
    }));
    $('#tn-table tbody').innerHTML = rows.join('') || '<tr><td colspan="6" class="muted">No tenants.</td></tr>';
  },

  async usage() {
    const period = $('#us-period').value;
    const u = (await api('/usage?period=' + period)).usage || [];
    $('#us-table tbody').innerHTML = u.map((t) => {
      const top = Object.entries(t.usage || {}).slice(0, 6).map(([k, v]) => `${k}: ${v}`).join(', ') || '—';
      return `<tr><td>${t.tenantId}</td><td>${t.planId}</td><td class="muted">${top}</td></tr>`;
    }).join('') || '<tr><td colspan="3" class="muted">No usage recorded.</td></tr>';
  },
  async quota() {
    const q = (await api('/quota/check', 'POST', { tenantId: $('#us-tid').value })).quota || {};
    $('#us-quota tbody').innerHTML = (q.results || []).map((r) => {
      const cls = r.level === 'exceeded' ? 'bad' : r.level === 'warning' ? 'warn' : '';
      return `<tr><td>${r.limitKey}</td><td>${r.used}</td><td>${r.unlimited ? '∞' : r.limit}</td><td><div class="bar ${cls}"><i style="width:${Math.min(100, r.percent)}%"></i></div></td><td>${lvlChip(r.level)}</td></tr>`;
    }).join('') || '<tr><td colspan="5" class="muted">No limits.</td></tr>';
  },

  async invoices() {
    const list = (await api('/invoices')).invoices || [];
    $('#in-table tbody').innerHTML = list.map((i) =>
      `<tr><td>${i.invoiceNumber}</td><td>${i.tenantId}</td><td>${money(i.amount, i.currency)}</td><td>${stChip(i.status)}</td><td>${(i.dueAt || '').slice(0, 10)}</td><td>${['draft', 'issued', 'overdue'].includes(i.status) ? `<button class="btn ghost" onclick="App.markReview('${i.id}')">Mark for review</button>` : '—'}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">No invoices.</td></tr>';
  },
  async markReview(id) {
    const r = await api(`/invoices/${id}/mark-paid-review`, 'POST', { paymentReference: 'REVIEW-' + Date.now() });
    alert(r.manualReviewRequired ? 'Submitted for manual review (not auto-paid).' : JSON.stringify(r));
    this.invoices();
  },

  async resellers() {
    const r = await api('/resellers');
    const rows = await Promise.all((r.resellers || []).map(async (x) => {
      const c = (await api(`/resellers/${x.id}/commissions`)).commissions || {};
      return `<tr><td>${x.id}</td><td>${x.name}</td><td>${stChip(x.status)}</td><td>${x.assignedTenants.length}</td><td>${(x.commissionRate * 100).toFixed(0)}%</td><td>${money(c.totalCommissionAmount)} (${c.unpaidCount || 0} unpaid)</td></tr>`;
    }));
    $('#rs-table tbody').innerHTML = rows.join('') || '<tr><td colspan="6" class="muted">No resellers.</td></tr>';
    $('#rs-legacy').textContent = `Legacy reseller records detected: ${r.legacyResellerCount || 0}`;
  },

  async doctor() {
    const d = (await api('/doctor')).doctor || {};
    $('#dr-cards').innerHTML = [
      ['Score', `${d.score}/100`], ['Status', d.status], ['Blockers', (d.blockers || []).length], ['Warnings', (d.warnings || []).length],
    ].map(([l, n]) => `<div class="sb-stat"><div class="n">${n}</div><div class="l">${l}</div></div>`).join('');
    $('#dr-table tbody').innerHTML = (d.checks || []).map((c) =>
      `<tr><td>${c.name}</td><td>${c.level === 'blocker' ? lvlChip('bad') : lvlChip('warn')}</td><td>${c.ok ? '✅' : '❌'}</td><td class="muted">${c.detail || ''}</td></tr>`).join('');
    $('#dr-pay tbody').innerHTML = (d.paymentAdapters || []).map((a) =>
      `<tr><td>${a.name}</td><td>${stChip(a.status)}</td><td>${a.configured ? '✅' : '—'}</td></tr>`).join('');
    $('#dr-steps').innerHTML = (d.nextSteps || []).map((s) => `<li>${s}</li>`).join('');
  },

  bind() {
    $('#us-period').onchange = () => this.usage();
    $('#us-check').onclick = () => this.quota();
    $('#tn-issue').onclick = async () => { $('#tn-out').textContent = JSON.stringify(await api(`/tenants/${encodeURIComponent($('#tn-id').value)}/license`, 'POST', { planId: $('#tn-plan').value }), null, 2); this.tenants(); };
    $('#in-create').onclick = async () => { $('#in-out').textContent = JSON.stringify(await api('/invoices', 'POST', { tenantId: $('#in-tid').value, planId: $('#in-plan').value, dueInDays: Number($('#in-due').value) }), null, 2); this.invoices(); };
    $('#fg-check').onclick = async () => { $('#fg-out').textContent = JSON.stringify((await api('/feature/check', 'POST', this.gateBody())).decision, null, 2); };
    $('#fg-preview').onclick = async () => { $('#fg-out').textContent = JSON.stringify((await api('/feature/preview-enforcement', 'POST', this.gateBody())).preview, null, 2); };
    $('#rs-add').onclick = async () => { $('#rs-out').textContent = JSON.stringify(await api('/resellers', 'POST', { name: $('#rs-name').value, email: $('#rs-email').value, commissionRate: Number($('#rs-rate').value) }), null, 2); this.resellers(); };
  },
  gateBody() {
    const b = { tenantId: $('#fg-tid').value, feature: $('#fg-feature').value, action: $('#fg-action').value };
    if ($('#fg-metric').value.trim()) b.metric = $('#fg-metric').value.trim();
    return b;
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
