// public/js/customer-portal.js — Customer Portal client. Preview-only: never pays, sends, downloads, or mutates.
const API = '/api/customer-portal';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

async function api(path, method = 'GET', body) {
  try {
    const opt = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opt.body = JSON.stringify(body);
    const r = await fetch(API + path, opt);
    return await r.json();
  } catch (e) {
    return { ok: false, error: 'network_error', warnings: [], blockers: [] };
  }
}
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const badge = (text, cls = '') => `<span class="badge ${cls}">${esc(text)}</span>`;
function statusClass(s) {
  s = String(s || '');
  if (/paid|active|confirmed|approved|resolved|available/.test(s)) return 'ok';
  if (/delay|overdue|unpaid|open|expiring|unresolved|missing|pending/.test(s)) return 'warn';
  if (/block|expired|reject|cancel/.test(s)) return 'bad';
  return '';
}
function rows(el, items, fn) {
  const node = $(el);
  if (!items || !items.length) { node.innerHTML = '<div class="cp-empty">Nothing to show in this preview.</div>'; return; }
  node.innerHTML = items.map(fn).join('');
}

function renderSafetyBadges(status) {
  const items = [
    ['Safe preview', true], ['No live payment', !status.livePayment !== false], ['No live sends', true],
    ['No mutation', !status.liveActionsEnabled], ['PII masked', status.piiMasked], ['External calls off', !status.externalCallsEnabled],
  ];
  $('#cp-safety-badges').innerHTML = items.map(([k]) => `<span class="cp-badge">✓ ${esc(k)}</span>`).join('');
}

async function loadStatus() {
  const status = await api('/status');
  if (status && status.ok) renderSafetyBadges(status);
}

async function loadAll() {
  // Profile + KPIs
  const lookup = await api('/lookup-preview', 'POST', { mode: $('#cp-mode').value, reference: $('#cp-ref').value });
  if (lookup && lookup.ok) {
    $('#cp-error').hidden = true;
    $('#cp-profile').innerHTML = `<div class="row"><b>${esc(lookup.customerNameSafe)}</b> · ${esc(lookup.phoneMasked)} · ${esc(lookup.emailMasked)} · token ${esc(lookup.portalTokenPreview)}</div>`;
  } else {
    $('#cp-error').hidden = false;
    $('#cp-error').textContent = 'We could not load this preview right now. Please try again or contact support.';
  }

  const sum = await api('/summary');
  if (sum && sum.ok) {
    const kpis = [
      ['Open orders', sum.openOrdersPreview], ['Unpaid invoices', sum.unpaidInvoicesPreview],
      ['Upcoming bookings', sum.upcomingAppointmentsPreview], ['Open tickets', sum.openTicketsPreview],
      ['Loyalty points', sum.loyaltyPointsPreview],
    ];
    $('#cp-kpis').innerHTML = kpis.map(([k, v]) => `<div class="cp-kpi"><div class="k">${esc(k)}</div><div class="v">${v ?? '-'}</div></div>`).join('');
  }

  const [orders, invoices, bookings, service, maintenance, tickets, warranty, loyalty, documents] = await Promise.all([
    api('/orders'), api('/invoices'), api('/bookings'), api('/service-jobs'),
    api('/maintenance-plans'), api('/tickets'), api('/warranty'), api('/loyalty'), api('/documents'),
  ]);

  rows('#cp-orders', orders.ordersPreview, (o) => `<div class="cp-row"><span class="id">${esc(o.orderIdPreview)}</span>${badge(o.statusPreview, statusClass(o.statusPreview))} ${badge(o.paymentStatusPreview, statusClass(o.paymentStatusPreview))}</div>`);
  rows('#cp-invoices', invoices.invoicesPreview, (i) => `<div class="cp-row"><span class="id">${esc(i.invoiceIdPreview)}</span><span>Bal: ${esc(i.balancePreview)}</span>${badge(i.statusPreview, statusClass(i.statusPreview))}</div>`);
  rows('#cp-bookings', bookings.bookingsPreview, (b) => `<div class="cp-row"><span class="id">${esc(b.bookingIdPreview)}</span><span>${esc((b.scheduledTimePreview || '').slice(0, 16).replace('T', ' '))}</span>${badge(b.statusPreview, statusClass(b.statusPreview))}</div>`);
  rows('#cp-service', service.serviceJobsPreview, (j) => `<div class="cp-row"><span class="id">${esc(j.workOrderIdPreview)}</span><span>${esc(j.technicianSafe)}</span>${badge(j.statusPreview, statusClass(j.statusPreview))}</div>`);
  rows('#cp-maintenance', maintenance.maintenancePlansPreview, (p) => `<div class="cp-row"><span>${esc(p.planSafe)}</span>${badge(p.statusPreview, statusClass(p.statusPreview))}</div>`);
  rows('#cp-tickets', tickets.ticketsPreview, (t) => `<div class="cp-row"><span class="id">${esc(t.ticketIdPreview)}</span><span>${esc(t.subjectSafe)}</span>${badge(t.statusPreview, statusClass(t.statusPreview))}</div>`);
  rows('#cp-warranty', warranty.warrantyPreview, (w) => `<div class="cp-row"><span>${esc(w.productSafe)}</span>${badge(w.statusPreview, statusClass(w.statusPreview))}</div>`);
  $('#cp-loyalty').innerHTML = loyalty && loyalty.ok
    ? `<div class="cp-row"><span>Points: <b>${esc(loyalty.loyaltyPointsPreview)}</b> · Tier: ${esc(loyalty.tierSafe)}</span>${badge('expiring: ' + loyalty.expiringPointsPreview, 'warn')}</div>`
    : '<div class="cp-empty">No loyalty preview.</div>';
  rows('#cp-documents', documents.documentsPreview, (d) => `<div class="cp-row"><span class="id">${esc(d.documentIdPreview)}</span><span>${esc(d.nameSafe)}</span>${badge(d.statusPreview, statusClass(d.statusPreview))}</div>`);
}

// Draft preview actions
const DRAFTS = {
  support: () => api('/support-request-preview', 'POST', { subject: 'Need help', message: 'I have a question about my order.' }),
  reschedule: () => api('/reschedule-request-preview', 'POST', { requestedTime: 'Next week' }),
  reminder: () => api('/payment-reminder-preview', 'POST', {}),
  message: () => api('/message-draft-preview', 'POST', { message: 'Hello, this is a preview message.' }),
  document: () => api('/document-request-preview', 'POST', { documentId: 'doc_1101' }),
};
$$('[data-draft]').forEach((b) => b.addEventListener('click', async () => {
  const out = $('#cp-draft-out');
  out.classList.add('show');
  out.textContent = 'Preparing safe preview…';
  const res = await DRAFTS[b.dataset.draft]();
  out.textContent = 'Safe preview (nothing was sent or charged):\n\n' + JSON.stringify(res, null, 2);
}));

$('#cp-lookup-form').addEventListener('submit', (e) => { e.preventDefault(); loadAll(); });

(async function init() {
  await loadStatus();
  await loadAll();
})();
