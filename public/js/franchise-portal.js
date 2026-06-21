// public/js/franchise-portal.js — Franchise Portal client. Preview-only: never orders, pays, sends, downloads, or mutates.
const API = '/api/franchise-portal';
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
  if (/paid|active|passed|available|delivered|exclusive/.test(s)) return 'ok';
  if (/pending|onboarding|unpaid|processing|expiring|missing|below|renewal/.test(s)) return 'warn';
  if (/block|failed|suspend|terminate|reject|overdue|delayed/.test(s)) return 'bad';
  return '';
}
function rows(el, items, fn) {
  const node = $(el);
  if (!node) return;
  if (!items || !items.length) { node.innerHTML = '<div class="fp-empty">Nothing to show in this preview.</div>'; return; }
  node.innerHTML = items.map(fn).join('');
}

function renderSafetyBadges() {
  const items = ['Safe preview', 'dryRun true', 'No order creation', 'No royalty mutation',
    'No live payment', 'No live sends', 'PII masked', 'External calls off'];
  $('#fp-safety-badges').innerHTML = items.map((k) => `<span class="fp-badge">✓ ${esc(k)}</span>`).join('');
}

async function loadStatus() { await api('/status'); renderSafetyBadges(); }

async function loadAll() {
  const lookup = await api('/lookup-preview', 'POST', { mode: $('#fp-mode').value, reference: $('#fp-ref').value });
  if (lookup && lookup.ok) {
    $('#fp-error').hidden = true;
    $('#fp-profile').innerHTML = `<div class="row"><b>${esc(lookup.franchiseNameSafe)}</b> · ${esc(lookup.phoneMasked)} · ${esc(lookup.emailMasked)} · token ${esc(lookup.franchiseTokenPreview)}</div>`;
  } else {
    $('#fp-error').hidden = false;
    $('#fp-error').textContent = 'We could not load this preview right now. Please try again or contact your franchise manager.';
  }

  const sum = await api('/summary');
  if (sum && sum.ok) {
    const kpis = [
      ['Outlets', sum.totalOutletsPreview], ['Active', sum.activeOutletsPreview],
      ['Sales MTD', money(sum.totalSalesMtdPreview)], ['Payable', money(sum.outstandingPayablePreview)],
      ['Open orders', sum.openOrdersPreview], ['Pending compliance', sum.pendingCompliancePreview],
    ];
    $('#fp-kpis').innerHTML = kpis.map(([k, v]) => `<div class="fp-kpi"><div class="k">${esc(k)}</div><div class="v">${v ?? '-'}</div></div>`).join('');
  }

  const [account, tier, outlets, sales, targets, royalty, royaltyInv, payable, inventory,
    orders, fund, headcount, compliance, territory, contracts, documents, audit] = await Promise.all([
    api('/outlet-account'), api('/tier-status'), api('/outlets'), api('/sales-summary'), api('/target-achievement'),
    api('/royalty'), api('/royalty-invoices'), api('/outstanding-payable'), api('/inventory-allocation'),
    api('/orders'), api('/marketing-fund'), api('/headcount'), api('/compliance'), api('/territory'),
    api('/contracts'), api('/documents'), api('/audit-preview'),
  ]);

  $('#fp-account').innerHTML = (account && account.ok)
    ? `<div class="fp-row"><span>Outlets</span><b>${esc(account.activeOutletsPreview)}/${esc(account.totalOutletsPreview)} active</b></div><div class="fp-row"><span>Tier</span>${badge((tier && tier.tierLabelPreview) || 'tier_preview', 'ok')}</div><div class="fp-row"><span>Agreement</span>${badge((tier && tier.agreementStatusPreview) || 'active_preview', statusClass((tier && tier.agreementStatusPreview)))}</div>`
    : '<div class="fp-empty">No account preview.</div>';

  rows('#fp-outlets', outlets.outletsPreview, (o) => `<div class="fp-row"><span class="id">${esc(o.outletIdPreview)}</span><span>${esc(o.nameSafe)}</span>${badge(o.statusPreview, statusClass(o.statusPreview))}</div>`);
  rows('#fp-sales', sales.outletsSalesPreview, (s) => `<div class="fp-row"><span>${esc(s.nameSafe)}</span><b>${money(s.salesMtdPreview)}</b></div>`);
  rows('#fp-targets', targets.targetAchievementPreview, (t) => `<div class="fp-row"><span>${esc(t.nameSafe)}</span><span>${money(t.achievedPreview)}/${money(t.targetPreview)}</span>${badge(t.achievementPercentPreview + '%', t.achievementPercentPreview < 80 ? 'bad' : (t.achievementPercentPreview < 100 ? 'warn' : 'ok'))}</div>`);

  $('#fp-royalty').innerHTML = (royalty && royalty.ok)
    ? `<div class="fp-row"><span>Period ${esc(royalty.royaltyPeriodPreview)}</span><span>Rate: <b>${esc(royalty.royaltyRatePercentPreview)}%</b></span>${badge(royalty.royaltyStatusPreview, statusClass(royalty.royaltyStatusPreview))}</div>`
    : '<div class="fp-empty">No royalty preview.</div>';

  const payItems = [
    `<div class="fp-row"><span>Outstanding payable</span>${badge(money((payable && payable.outstandingPayablePreview) || 0), 'warn')}</div>`,
    ...((royaltyInv.royaltyInvoicesPreview) || []).map((i) => `<div class="fp-row"><span class="id">${esc(i.invoiceIdPreview)}</span><span>Bal: ${money(i.balancePreview)}</span>${badge(i.paymentStatusPreview, statusClass(i.paymentStatusPreview))}</div>`),
  ];
  $('#fp-payables').innerHTML = payItems.join('');

  rows('#fp-inventory', inventory.inventoryAllocationPreview, (p) => `<div class="fp-row"><span>${esc(p.nameSafe)}</span><span>${esc(p.onHandQtyPreview)}/${esc(p.allocatedQtyPreview)}</span></div>`);
  rows('#fp-orders', orders.ordersPreview, (o) => `<div class="fp-row"><span class="id">${esc(o.orderIdPreview)}</span><span>${money(o.totalPreview)}</span>${badge(o.statusPreview, statusClass(o.statusPreview))}${o.delayed ? badge('delayed', 'bad') : ''}</div>`);

  $('#fp-fund').innerHTML = (fund && fund.ok)
    ? `<div class="fp-row"><span>Balance</span><b>${money(fund.fundBalancePreview)}</b></div><div class="fp-row"><span>Contribution</span>${badge(fund.contributionPercentPreview + '%', 'ok')}</div>`
    : '<div class="fp-empty">No fund preview.</div>';

  rows('#fp-headcount', headcount.headcountByOutletPreview, (h) => `<div class="fp-row"><span>${esc(h.nameSafe)}</span><b>${esc(h.staffCountPreview)}</b></div>`);
  rows('#fp-compliance', compliance.complianceChecklistPreview, (c) => `<div class="fp-row"><span>${esc(c.nameSafe)}</span>${badge(c.statusPreview, statusClass(c.statusPreview))}</div>`);

  $('#fp-territory').innerHTML = (territory && territory.ok)
    ? `<div class="fp-row"><span>${esc(territory.territoryCodePreview)}</span>${badge(territory.exclusivityPreview, statusClass(territory.exclusivityPreview))}${badge(territory.statusPreview, statusClass(territory.statusPreview))}</div>`
    : '<div class="fp-empty">No territory preview.</div>';

  const docItems = [
    ...((contracts.contractsPreview) || []).map((c) => `<div class="fp-row"><span class="id">${esc(c.contractIdPreview)}</span><span>${esc(c.nameSafe)}</span>${badge(c.statusPreview, statusClass(c.statusPreview))}</div>`),
    ...((documents.documentsPreview) || []).map((d) => `<div class="fp-row"><span class="id">${esc(d.documentIdPreview)}</span><span>${esc(d.nameSafe)}</span>${badge(d.statusPreview, statusClass(d.statusPreview))}</div>`),
  ];
  $('#fp-documents').innerHTML = docItems.length ? docItems.join('') : '<div class="fp-empty">Nothing to show in this preview.</div>';

  rows('#fp-audit', audit.auditPreview, (a) => `<div class="fp-row"><span>${esc(a.action)}</span><span>${esc(a.franchiseMasked)}</span>${badge('preview', 'ok')}</div>`);
}

const DRAFTS = {
  replenishment: () => api('/replenishment-draft-preview', 'POST', { outletId: 'outlet_1', items: [{ sku: 'sku_1', qty: 200 }, { sku: 'sku_2', qty: 150 }] }),
  support: () => api('/support-request-preview', 'POST', { subject: 'Franchise query', message: 'I have a question about my outlet.' }),
  message: () => api('/message-draft-preview', 'POST', { message: 'Hello, this is a preview message.' }),
  document: () => api('/document-request-preview', 'POST', { documentId: 'doc_6001' }),
};
$$('[data-draft]').forEach((b) => b.addEventListener('click', async () => {
  const out = $('#fp-draft-out');
  out.classList.add('show');
  out.textContent = 'Preparing safe preview…';
  const res = await DRAFTS[b.dataset.draft]();
  out.textContent = 'Safe preview (nothing was ordered, sent, or paid):\n\n' + JSON.stringify(res, null, 2);
}));

$('#fp-lookup-form').addEventListener('submit', (e) => { e.preventDefault(); loadAll(); });

(async function init() {
  await loadStatus();
  await loadAll();
})();
