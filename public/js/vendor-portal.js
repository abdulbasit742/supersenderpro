// public/js/vendor-portal.js — Vendor Portal client. Preview-only: never submits, pays, sends, downloads, or mutates.
const API = '/api/vendor-portal';
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
const badge = (t, cls = '') => `<span class="badge ${cls}">${esc(t)}</span>`;
const money = (n) => (n == null ? '-' : Number(n).toLocaleString());
function statusClass(s) {
  s = String(s || '');
  if (/paid|active|valid|open|received|in_stock|approved|available/.test(s)) return 'ok';
  if (/pending|partially|submitted|scheduled|in_transit|expiring|missing|on_hold/.test(s)) return 'warn';
  if (/block|expired|suspend|reject|cancel|hold|delayed/.test(s)) return 'bad';
  return '';
}
function rows(el, items, fn) {
  const node = $(el);
  if (!node) return;
  if (!items || !items.length) { node.innerHTML = '<div class="vp-empty">Nothing to show in this preview.</div>'; return; }
  node.innerHTML = items.map(fn).join('');
}

function renderSafetyBadges() {
  const items = ['Safe preview', 'dryRun true', 'No PO mutation', 'No invoice submission',
    'No price mutation', 'No live payment', 'No live sends', 'PII masked', 'External calls off'];
  $('#vp-safety-badges').innerHTML = items.map((k) => `<span class="vp-badge">✓ ${esc(k)}</span>`).join('');
}

async function loadStatus() { await api('/status'); renderSafetyBadges(); }

async function loadAll() {
  const lookup = await api('/lookup-preview', 'POST', { mode: $('#vp-mode').value, reference: $('#vp-ref').value });
  if (lookup && lookup.ok) {
    $('#vp-error').hidden = true;
    $('#vp-profile').innerHTML = `<div class="row"><b>${esc(lookup.vendorNameSafe)}</b> · ${esc(lookup.phoneMasked)} · ${esc(lookup.emailMasked)} · token ${esc(lookup.vendorTokenPreview)}</div>`;
  } else {
    $('#vp-error').hidden = false;
    $('#vp-error').textContent = 'We could not load this preview right now. Please try again or contact procurement.';
  }

  const sum = await api('/summary');
  if (sum && sum.ok) {
    const kpis = [
      ['Open POs', sum.openPurchaseOrdersPreview], ['Pending GRNs', sum.pendingGrnsPreview],
      ['Unpaid invoices', sum.unpaidInvoicesPreview], ['Payable', money(sum.outstandingPayablePreview)],
      ['Active deliveries', sum.activeDeliveriesPreview], ['Pending QC', sum.pendingInspectionsPreview],
    ];
    $('#vp-kpis').innerHTML = kpis.map(([k, v]) => `<div class="vp-kpi"><div class="k">${esc(k)}</div><div class="v">${v ?? '-'}</div></div>`).join('');
  }

  const [account, tier, catalog, price, pos, grns, invoices, payable, schedule,
    deliveries, quality, compliance, rating, contracts, documents, audit] = await Promise.all([
    api('/account-status'), api('/tier-status'), api('/supply-catalog'), api('/price-list'),
    api('/purchase-orders'), api('/grns'), api('/invoices'), api('/outstanding-payable'), api('/payment-schedule'),
    api('/deliveries'), api('/quality-inspections'), api('/compliance-documents'), api('/rating'),
    api('/contracts'), api('/documents'), api('/audit-preview'),
  ]);

  $('#vp-account').innerHTML = (account && account.ok)
    ? `<div class="vp-row"><span>Account</span>${badge(account.accountStatusPreview, statusClass(account.accountStatusPreview))}</div><div class="vp-row"><span>Tier</span>${badge((tier && tier.tierLabelPreview) || 'tier_preview', 'ok')}</div>`
    : '<div class="vp-empty">No account preview.</div>';

  rows('#vp-catalog', catalog.supplyCatalogPreview, (p) => `<div class="vp-row"><span class="id">${esc(p.skuIdPreview)}</span><span>${esc(p.nameSafe)}</span><span class="id">lead ${esc(p.leadTimeDaysPreview)}d · MOQ ${esc(p.moqPreview)}</span></div>`);
  rows('#vp-price', price.priceListPreview, (p) => `<div class="vp-row"><span>${esc(p.nameSafe)}</span><span>Agreed: <b>${money(p.agreedPricePreview)}</b></span><span class="id">MOQ ${esc(p.moqPreview)}</span></div>`);
  rows('#vp-pos', pos.purchaseOrdersPreview, (o) => `<div class="vp-row"><span class="id">${esc(o.poIdPreview)}</span><span>${money(o.totalPreview)}</span>${badge(o.statusPreview, statusClass(o.statusPreview))}${o.delayed ? badge('delayed', 'bad') : ''}</div>`);
  rows('#vp-grns', grns.grnsPreview, (g) => `<div class="vp-row"><span class="id">${esc(g.grnIdPreview)}</span><span>qty ${esc(g.receivedQtyPreview)}</span>${badge(g.statusPreview, statusClass(g.statusPreview))}</div>`);
  rows('#vp-invoices', invoices.invoicesPreview, (i) => `<div class="vp-row"><span class="id">${esc(i.invoiceIdPreview)}</span><span>Bal: ${money(i.balancePreview)}</span>${badge(i.paymentStatusPreview, statusClass(i.paymentStatusPreview))}</div>`);

  const payItems = [
    `<div class="vp-row"><span>Outstanding payable</span>${badge(money((payable && payable.outstandingPayablePreview) || 0), 'warn')}</div>`,
    ...((schedule.paymentSchedulePreview) || []).map((s) => `<div class="vp-row"><span class="id">${esc(s.scheduleIdPreview)}</span><span>${money(s.amountPreview)}</span>${badge(s.statusPreview, statusClass(s.statusPreview))}</div>`),
  ];
  $('#vp-payables').innerHTML = payItems.join('');

  rows('#vp-deliveries', deliveries.deliveriesPreview, (d) => `<div class="vp-row"><span class="id">${esc(d.deliveryIdPreview)}</span><span>${esc(d.carrierSafe)}</span>${badge(d.statusPreview, statusClass(d.statusPreview))}</div>`);
  rows('#vp-quality', quality.qualityInspectionsPreview, (q) => `<div class="vp-row"><span class="id">${esc(q.inspectionIdPreview)}</span>${badge(q.statusPreview, statusClass(q.statusPreview))}</div>`);
  rows('#vp-compliance', compliance.complianceDocumentsPreview, (c) => `<div class="vp-row"><span>${esc(c.nameSafe)}</span>${badge(c.statusPreview, statusClass(c.statusPreview))}</div>`);

  $('#vp-rating').innerHTML = (rating && rating.ok)
    ? `<div class="vp-row"><span>Score</span><b>${esc(rating.ratingScorePreview)}</b></div><div class="vp-row"><span>On-time</span>${badge(Math.round((rating.onTimeRatePreview || 0) * 100) + '%', statusClass(rating.onTimeRatePreview < 0.9 ? 'low' : 'ok'))}</div><div class="vp-row"><span>Quality</span>${badge(Math.round((rating.qualityRatePreview || 0) * 100) + '%', 'ok')}</div>`
    : '<div class="vp-empty">No rating preview.</div>';

  const docItems = [
    ...((contracts.contractsPreview) || []).map((c) => `<div class="vp-row"><span class="id">${esc(c.contractIdPreview)}</span><span>${esc(c.nameSafe)}</span>${badge(c.statusPreview, statusClass(c.statusPreview))}</div>`),
    ...((documents.documentsPreview) || []).map((d) => `<div class="vp-row"><span class="id">${esc(d.documentIdPreview)}</span><span>${esc(d.nameSafe)}</span>${badge(d.statusPreview, statusClass(d.statusPreview))}</div>`),
  ];
  $('#vp-documents').innerHTML = docItems.length ? docItems.join('') : '<div class="vp-empty">Nothing to show in this preview.</div>';

  rows('#vp-audit', audit.auditPreview, (a) => `<div class="vp-row"><span>${esc(a.action)}</span><span>${esc(a.vendorMasked)}</span>${badge('preview', 'ok')}</div>`);
}

const DRAFTS = {
  invoice: () => api('/invoice-submission-preview', 'POST', { poId: 'po_1001', items: [{ sku: 'sku_1', qty: 500, unitPrice: 320 }] }),
  payment: () => api('/payment-query-preview', 'POST', { invoiceId: 'vinv_3001', subject: 'Payment status', message: 'Please advise on payment timeline.' }),
  support: () => api('/support-request-preview', 'POST', { subject: 'Vendor query', message: 'I have a question about a purchase order.' }),
  message: () => api('/message-draft-preview', 'POST', { message: 'Hello, this is a preview message.' }),
  document: () => api('/document-request-preview', 'POST', { documentId: 'doc_7001' }),
};
$$('[data-draft]').forEach((b) => b.addEventListener('click', async () => {
  const out = $('#vp-draft-out');
  out.classList.add('show');
  out.textContent = 'Preparing safe preview…';
  const res = await DRAFTS[b.dataset.draft]();
  out.textContent = 'Safe preview (nothing was submitted, sent, or paid):\n\n' + JSON.stringify(res, null, 2);
}));

$('#vp-lookup-form').addEventListener('submit', (e) => { e.preventDefault(); loadAll(); });

(async function init() {
  await loadStatus();
  await loadAll();
})();
