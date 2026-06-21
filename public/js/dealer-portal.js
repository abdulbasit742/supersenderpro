// public/js/dealer-portal.js — Dealer Portal client. Preview-only: never orders, pays, sends, downloads, or mutates.
const API = '/api/dealer-portal';
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
const money = (n) => (n == null ? '-' : Number(n).toLocaleString());
function statusClass(s) {
  s = String(s || '');
  if (/paid|active|in_stock|delivered|approved|available/.test(s)) return 'ok';
  if (/pending|delayed|unpaid|low_stock|in_transit|under_review|expiring|missing|on_hold|dispatched/.test(s)) return 'warn';
  if (/block|out_of_stock|suspend|reject|cancel|hold/.test(s)) return 'bad';
  return '';
}
function rows(el, items, fn) {
  const node = $(el);
  if (!node) return;
  if (!items || !items.length) { node.innerHTML = '<div class="dp-empty">Nothing to show in this preview.</div>'; return; }
  node.innerHTML = items.map(fn).join('');
}

function renderSafetyBadges() {
  const items = ['Safe preview', 'dryRun true', 'No order creation', 'No stock reservation',
    'No price mutation', 'No live payment', 'No live sends', 'PII masked', 'External calls off'];
  $('#dp-safety-badges').innerHTML = items.map((k) => `<span class="dp-badge">✓ ${esc(k)}</span>`).join('');
}

async function loadStatus() {
  await api('/status');
  renderSafetyBadges();
}

async function loadAll() {
  const lookup = await api('/lookup-preview', 'POST', { mode: $('#dp-mode').value, reference: $('#dp-ref').value });
  if (lookup && lookup.ok) {
    $('#dp-error').hidden = true;
    $('#dp-profile').innerHTML = `<div class="row"><b>${esc(lookup.dealerNameSafe)}</b> · ${esc(lookup.phoneMasked)} · ${esc(lookup.emailMasked)} · token ${esc(lookup.dealerTokenPreview)}</div>`;
  } else {
    $('#dp-error').hidden = false;
    $('#dp-error').textContent = 'We could not load this preview right now. Please try again or contact your account manager.';
  }

  const sum = await api('/summary');
  if (sum && sum.ok) {
    const kpis = [
      ['Open orders', sum.openOrdersPreview], ['Unpaid invoices', sum.unpaidInvoicesPreview],
      ['Available credit', money(sum.availableCreditPreview)], ['Outstanding', money(sum.outstandingBalancePreview)],
      ['Active deliveries', sum.activeDeliveriesPreview], ['Loyalty points', sum.loyaltyPointsPreview],
    ];
    $('#dp-kpis').innerHTML = kpis.map(([k, v]) => `<div class="dp-kpi"><div class="k">${esc(k)}</div><div class="v">${v ?? '-'}</div></div>`).join('');
  }

  const [account, tier, catalog, price, wholesale, stock, orders, invoices, credit, outstanding,
    commission, deliveries, shipments, returns, warranty, loyalty, contracts, documents, audit] = await Promise.all([
    api('/account-status'), api('/tier-status'), api('/catalog'), api('/price-list'), api('/wholesale-prices'),
    api('/stock-availability'), api('/orders'), api('/invoices'), api('/credit-limit'), api('/outstanding-balance'),
    api('/commission-margin'), api('/deliveries'), api('/shipments'), api('/returns-claims'), api('/warranty-claims'),
    api('/loyalty'), api('/contracts'), api('/documents'), api('/audit-preview'),
  ]);

  $('#dp-account').innerHTML = (account && account.ok)
    ? `<div class="dp-row"><span>Account</span>${badge(account.accountStatusPreview, statusClass(account.accountStatusPreview))}</div><div class="dp-row"><span>Tier</span>${badge((tier && tier.tierLabelPreview) || 'tier_preview', 'ok')}</div>${account.creditHoldPreview ? `<div class="dp-row"><span>Credit hold</span>${badge('on hold', 'bad')}</div>` : ''}`
    : '<div class="dp-empty">No account preview.</div>';

  rows('#dp-catalog', catalog.catalogPreview, (p) => `<div class="dp-row"><span class="id">${esc(p.productIdPreview)}</span><span>${esc(p.nameSafe)}</span>${badge(p.inStockPreview ? 'in stock' : 'out of stock', p.inStockPreview ? 'ok' : 'bad')}</div>`);
  rows('#dp-price', price.priceListPreview, (p) => `<div class="dp-row"><span>${esc(p.nameSafe)}</span><span>Dealer: <b>${money(p.dealerPricePreview)}</b></span><span class="id">MOQ ${esc(p.moqPreview)}</span></div>`);
  rows('#dp-wholesale', wholesale.wholesalePricesPreview, (p) => `<div class="dp-row"><span>${esc(p.nameSafe)}</span><span>WS: <b>${money(p.wholesalePricePreview)}</b></span><span class="id">MOQ ${esc(p.moqPreview)}</span></div>`);
  rows('#dp-stock', stock.stockAvailabilityPreview, (p) => `<div class="dp-row"><span>${esc(p.nameSafe)}</span>${badge(p.availabilityPreview, statusClass(p.availabilityPreview))}</div>`);
  rows('#dp-orders', orders.ordersPreview, (o) => `<div class="dp-row"><span class="id">${esc(o.orderIdPreview)}</span><span>${money(o.totalPreview)}</span>${badge(o.statusPreview, statusClass(o.statusPreview))}</div>`);
  rows('#dp-invoices', invoices.invoicesPreview, (i) => `<div class="dp-row"><span class="id">${esc(i.invoiceIdPreview)}</span><span>Bal: ${money(i.balancePreview)}</span>${badge(i.paymentStatusPreview, statusClass(i.paymentStatusPreview))}</div>`);

  $('#dp-credit').innerHTML = (credit && credit.ok)
    ? `<div class="dp-row"><span>Limit</span><b>${money(credit.creditLimitPreview)}</b></div><div class="dp-row"><span>Used</span><b>${money(credit.usedCreditPreview)}</b></div><div class="dp-row"><span>Available</span><b>${money(credit.availableCreditPreview)}</b></div><div class="dp-row"><span>Outstanding</span>${badge(money((outstanding && outstanding.outstandingBalancePreview) || 0), 'warn')}</div>${credit.creditHoldPreview ? `<div class="dp-row"><span>Hold</span>${badge('credit hold', 'bad')}</div>` : ''}`
    : '<div class="dp-empty">No credit preview.</div>';

  $('#dp-commission').innerHTML = (commission && commission.ok)
    ? `<div class="dp-row"><span>Period ${esc(commission.commissionPeriodPreview)}</span><span>Margin: <b>${esc(commission.marginPercentPreview)}%</b></span>${badge(commission.payoutStatusPreview, statusClass(commission.payoutStatusPreview))}</div>`
    : '<div class="dp-empty">No commission preview.</div>';

  const delivItems = [
    ...(deliveries.deliveriesPreview || []).map((d) => `<div class="dp-row"><span class="id">${esc(d.deliveryIdPreview)}</span><span>${esc(d.carrierSafe)}</span>${badge(d.statusPreview, statusClass(d.statusPreview))}</div>`),
    ...(shipments.shipmentsPreview || []).map((s) => `<div class="dp-row"><span class="id">${esc(s.shipmentIdPreview)}</span><span class="id">${esc(s.trackingRefMasked)}</span>${badge(s.statusPreview, statusClass(s.statusPreview))}</div>`),
  ];
  $('#dp-delivery').innerHTML = delivItems.length ? delivItems.join('') : '<div class="dp-empty">Nothing to show in this preview.</div>';

  const retItems = [
    ...(returns.returnsClaimsPreview || []).map((r) => `<div class="dp-row"><span class="id">${esc(r.returnIdPreview)}</span><span>${esc(r.reasonSafe)}</span>${badge(r.statusPreview, statusClass(r.statusPreview))}</div>`),
    ...(warranty.warrantyClaimsPreview || []).map((w) => `<div class="dp-row"><span class="id">${esc(w.claimIdPreview)}</span><span>${esc(w.productSafe)}</span>${badge(w.statusPreview, statusClass(w.statusPreview))}</div>`),
  ];
  $('#dp-returns').innerHTML = retItems.length ? retItems.join('') : '<div class="dp-empty">Nothing to show in this preview.</div>';

  $('#dp-loyalty').innerHTML = (loyalty && loyalty.ok)
    ? `<div class="dp-row"><span>Points: <b>${esc(loyalty.loyaltyPointsPreview)}</b> · ${esc(loyalty.tierSafe)}</span>${badge('expiring: ' + loyalty.expiringPointsPreview, 'warn')}</div>`
    : '<div class="dp-empty">No loyalty preview.</div>';

  const docItems = [
    ...((contracts.contractsPreview) || []).map((c) => `<div class="dp-row"><span class="id">${esc(c.contractIdPreview)}</span><span>${esc(c.nameSafe)}</span>${badge(c.statusPreview, statusClass(c.statusPreview))}</div>`),
    ...((documents.documentsPreview) || []).map((d) => `<div class="dp-row"><span class="id">${esc(d.documentIdPreview)}</span><span>${esc(d.nameSafe)}</span>${badge(d.statusPreview, statusClass(d.statusPreview))}</div>`),
  ];
  $('#dp-documents').innerHTML = docItems.length ? docItems.join('') : '<div class="dp-empty">Nothing to show in this preview.</div>';

  rows('#dp-audit', audit.auditPreview, (a) => `<div class="dp-row"><span>${esc(a.action)}</span><span>${esc(a.dealerMasked)}</span>${badge('preview', 'ok')}</div>`);
}

// Draft preview actions
const DRAFTS = {
  bulk: () => api('/bulk-order-draft-preview', 'POST', { items: [{ productId: 'prod_1', qty: 60 }, { productId: 'prod_3', qty: 100 }] }),
  quotation: () => api('/quotation-request-preview', 'POST', { items: [{ productId: 'prod_1', qty: 60 }] }),
  payment: () => api('/payment-query-preview', 'POST', { invoiceId: 'inv_2001', subject: 'Payment confirmation', message: 'Please confirm receipt of payment.' }),
  support: () => api('/support-request-preview', 'POST', { subject: 'Dealer query', message: 'I have a question about my account.' }),
  message: () => api('/message-draft-preview', 'POST', { message: 'Hello, this is a preview message.' }),
  document: () => api('/document-request-preview', 'POST', { documentId: 'doc_6001' }),
};
$$('[data-draft]').forEach((b) => b.addEventListener('click', async () => {
  const out = $('#dp-draft-out');
  out.classList.add('show');
  out.textContent = 'Preparing safe preview…';
  const res = await DRAFTS[b.dataset.draft]();
  out.textContent = 'Safe preview (nothing was ordered, sent, or charged):\n\n' + JSON.stringify(res, null, 2);
}));

$('#dp-lookup-form').addEventListener('submit', (e) => { e.preventDefault(); loadAll(); });

(async function init() {
  await loadStatus();
  await loadAll();
})();
