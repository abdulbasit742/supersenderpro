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

// ---- Advanced B2B Commerce Operating System sections ----
async function loadAdvanced() {
  const [onboarding, compliance, contractPrices, tierDisc, volDisc, warehouse, branch,
    backorders, partial, statement, creditRisk, rebates, targets, leaderboard, territory, risk, analytics, ai] =
    await Promise.all([
      api('/onboarding'), api('/compliance-documents'), api('/contract-prices'), api('/tier-discounts'),
      api('/volume-discounts', 'POST', { qty: 120 }), api('/warehouse-stock'), api('/branch-stock'),
      api('/backorders'), api('/partial-shipments'), api('/statement'), api('/credit-risk'),
      api('/rebates-incentives'), api('/targets-achievements'), api('/leaderboard'), api('/territory-performance'),
      api('/risk-score'), api('/analytics'), api('/ai-insight-preview', 'POST', {}),
    ]);

  $('#dp-onboarding').innerHTML = (onboarding && onboarding.ok)
    ? `<div class="dp-row"><span>Stage</span>${badge(onboarding.stagePreview, statusClass(onboarding.stagePreview))}</div>`
      + `<div class="dp-row"><span>KYC</span>${badge(onboarding.kycStatusPreview, statusClass(onboarding.kycStatusPreview))}</div>`
      + `<div class="dp-row"><span>Steps</span><b>${esc(onboarding.stepsDonePreview)}/${esc(onboarding.stepsTotalPreview)}</b></div>`
      + ((compliance && compliance.complianceDocumentsPreview) || []).map((d) => `<div class="dp-row"><span>${esc(d.nameSafe)}</span>${badge(d.statusPreview, statusClass(d.statusPreview))}</div>`).join('')
    : '<div class="dp-empty">No onboarding preview.</div>';

  rows('#dp-contract-prices', contractPrices.contractPricesPreview, (p) => `<div class="dp-row"><span class="id">${esc(p.productIdPreview)}</span><span>Retail ${money(p.retailPricePreview)}</span><span>Contract <b>${money(p.contractPricePreview)}</b></span></div>`);

  $('#dp-discounts').innerHTML = ((tierDisc && tierDisc.ok) || (volDisc && volDisc.ok))
    ? `<div class="dp-row"><span>Your tier</span>${badge(tierDisc.tierPreview, 'ok')}<span><b>${esc(tierDisc.tierDiscountPercentPreview)}%</b></span></div>`
      + (volDisc.volumeTiersPreview || []).map((t) => `<div class="dp-row"><span>≥ ${esc(t.minQtyPreview)} units</span><span><b>${esc(t.percentPreview)}%</b></span></div>`).join('')
      + `<div class="dp-row"><span>Applicable @ 120</span>${badge(volDisc.applicableVolumeDiscountPreview + '%', 'ok')}</div>`
    : '<div class="dp-empty">No discount preview.</div>';

  rows('#dp-warehouse', warehouse.warehouseStockPreview, (w) => `<div class="dp-row"><span><b>${esc(w.warehousePreview)}</b></span><span>${(w.itemsPreview || []).map((i) => esc(i.productIdPreview) + ':' + esc(i.qtyPreview)).join(' · ')}</span></div>`);
  rows('#dp-branch', branch.branchStockPreview, (b) => `<div class="dp-row"><span><b>${esc(b.branchPreview)}</b></span><span>${(b.itemsPreview || []).map((i) => esc(i.productIdPreview) + ':' + esc(i.qtyPreview)).join(' · ')}</span></div>`);

  const boItems = [
    ...(backorders.backordersPreview || []).map((b) => `<div class="dp-row"><span class="id">${esc(b.backorderIdPreview)}</span><span>${esc(b.productIdPreview)} ×${esc(b.qtyPreview)}</span>${badge('backorder', 'warn')}</div>`),
    ...(partial.partialShipmentsPreview || []).map((p) => `<div class="dp-row"><span class="id">${esc(p.shipmentIdPreview)}</span><span>shipped ${esc(p.shippedQtyPreview)} / pending ${esc(p.pendingQtyPreview)}</span>${badge(p.statusPreview, 'warn')}</div>`),
  ];
  $('#dp-backorders').innerHTML = boItems.length ? boItems.join('') : '<div class="dp-empty">Nothing to show in this preview.</div>';

  $('#dp-statement').innerHTML = (statement && statement.ok)
    ? `<div class="dp-row"><span>Opening</span><b>${money(statement.openingBalancePreview)}</b></div>`
      + `<div class="dp-row"><span>Charges</span><b>${money(statement.chargesPreview)}</b></div>`
      + `<div class="dp-row"><span>Payments</span><b>${money(statement.paymentsPreview)}</b></div>`
      + `<div class="dp-row"><span>Closing</span>${badge(money(statement.closingBalancePreview), 'warn')}</div>`
    : '<div class="dp-empty">No statement preview.</div>';

  $('#dp-credit-risk').innerHTML = (creditRisk && creditRisk.ok)
    ? `<div class="dp-row"><span>Risk level</span>${badge(creditRisk.creditRiskLevelPreview, statusClass(creditRisk.creditRiskLevelPreview === 'low' ? 'active' : creditRisk.creditRiskLevelPreview === 'high' ? 'block' : 'pending'))}</div>`
      + `<div class="dp-row"><span>Overdue</span><b>${money(creditRisk.overdueAmountPreview)}</b></div>`
      + `<div class="dp-row"><span>Available credit</span><b>${money(creditRisk.availableCreditPreview)}</b></div>`
      + `<div class="dp-row"><span>Recommended</span>${badge(creditRisk.recommendedActionPreview, 'warn')}</div>`
    : '<div class="dp-empty">No credit risk preview.</div>';

  rows('#dp-rebates', rebates.rebatesIncentivesPreview, (r) => `<div class="dp-row"><span>${esc(r.schemeSafe)}</span>${badge(r.statusPreview, statusClass(r.statusPreview))}</div>`);

  $('#dp-targets').innerHTML = (targets && targets.ok)
    ? `<div class="dp-row"><span>Target</span><b>${money(targets.targetPreview)}</b></div>`
      + `<div class="dp-row"><span>Achieved</span><b>${money(targets.achievedPreview)}</b></div>`
      + `<div class="dp-row"><span>Progress</span>${badge(targets.achievementPercentPreview + '%', targets.achievementPercentPreview >= 80 ? 'ok' : 'warn')}</div>`
    : '<div class="dp-empty">No target preview.</div>';

  rows('#dp-leaderboard', leaderboard.leaderboardPreview, (l) => `<div class="dp-row"><span>#${esc(l.rankPreview)}</span><span>${esc(l.dealerMasked)}</span><span><b>${esc(l.scorePreview)}</b></span></div>`);

  $('#dp-territory').innerHTML = (territory && territory.ok)
    ? `<div class="dp-row"><span>Region</span><b>${esc(territory.regionPreview)}</b></div>`
      + `<div class="dp-row"><span>Performance</span>${badge(territory.performancePercentPreview + '%', 'ok')}</div>`
      + `<div class="dp-row"><span>Rank in region</span><b>#${esc(territory.rankPreview)}</b> / ${esc(territory.dealersInRegionPreview)}</div>`
    : '<div class="dp-empty">No territory preview.</div>';

  $('#dp-risk').innerHTML = (risk && risk.ok)
    ? `<div class="dp-row"><span>Score</span>${badge(risk.riskScorePreview, risk.riskLevelPreview === 'low' ? 'ok' : risk.riskLevelPreview === 'high' ? 'bad' : 'warn')}</div>`
      + `<div class="dp-row"><span>Level</span>${badge(risk.riskLevelPreview, risk.riskLevelPreview === 'low' ? 'ok' : 'warn')}</div>`
      + (risk.riskSignalsPreview || []).map((s) => `<div class="dp-row"><span>${esc(s)}</span>${badge('signal', 'warn')}</div>`).join('')
    : '<div class="dp-empty">No risk preview.</div>';

  $('#dp-analytics').innerHTML = (analytics && analytics.ok && analytics.metricsPreview)
    ? Object.entries(analytics.metricsPreview).map(([k, v]) => `<div class="dp-row"><span>${esc(k.replace(/Preview$/, ''))}</span><b>${typeof v === 'number' ? money(v) : esc(v)}</b></div>`).join('')
    : '<div class="dp-empty">No analytics preview.</div>';

  $('#dp-ai').innerHTML = (ai && ai.ok)
    ? `<div class="dp-row"><span>${esc(ai.insightPreview)}</span>${badge('offline', 'ok')}</div>`
      + (ai.recommendationPreview || []).map((r) => `<div class="dp-row"><span>• ${esc(r)}</span></div>`).join('')
    : '<div class="dp-empty">No AI insight preview.</div>';
}

// ---- v2: Distributor B2B Commerce OS sections ----
async function loadAdvanced2() {
  const [verification, priceProt, promos, region, eta, claims, cart, quoteCompare] = await Promise.all([
    api('/business-verification'), api('/price-protection-preview', 'POST', { productId: 'prod_1' }),
    api('/promotion-eligibility'), api('/region-stock'), api('/delivery-eta-risk'), api('/claim-pipeline'),
    api('/cart-risk-preview', 'POST', { items: [{ productId: 'prod_1', qty: 60 }, { productId: 'prod_2', qty: 5 }] }),
    api('/dealer-quote-comparison-preview', 'POST', { productId: 'prod_1' }),
  ]);

  $('#dp-verification').innerHTML = (verification && verification.ok)
    ? `<div class="dp-row"><span>Status</span>${badge(verification.verificationStatusPreview, statusClass(verification.verificationStatusPreview))}</div>`
      + `<div class="dp-row"><span>Business name</span>${badge(verification.businessNameVerifiedPreview ? 'verified' : 'pending', verification.businessNameVerifiedPreview ? 'ok' : 'warn')}</div>`
      + `<div class="dp-row"><span>Tax</span>${badge(verification.taxVerifiedPreview ? 'verified' : 'pending', verification.taxVerifiedPreview ? 'ok' : 'warn')}</div>`
      + `<div class="dp-row"><span>Bank</span>${badge(verification.bankVerifiedPreview ? 'verified' : 'pending', verification.bankVerifiedPreview ? 'ok' : 'warn')}</div>`
    : '<div class="dp-empty">No verification preview.</div>';

  rows('#dp-price-protection', priceProt.priceProtectionPreview, (p) => `<div class="dp-row"><span class="id">${esc(p.productIdPreview)}</span><span>${money(p.oldPricePreview)} → <b>${money(p.newPricePreview)}</b></span>${badge('protected', 'ok')}</div>`);
  rows('#dp-promotions', promos.promotionEligibilityPreview, (p) => `<div class="dp-row"><span>${esc(p.nameSafe)}</span>${badge(p.eligiblePreview ? 'eligible' : 'not eligible', p.eligiblePreview ? 'ok' : 'warn')}</div>`);
  rows('#dp-region', region.regionStockPreview, (r) => `<div class="dp-row"><span><b>${esc(r.regionPreview)}</b></span><span>${(r.itemsPreview || []).map((i) => esc(i.productIdPreview) + ':' + esc(i.qtyPreview)).join(' · ')}</span></div>`);

  $('#dp-cart-risk').innerHTML = (cart && cart.ok)
    ? `<div class="dp-row"><span>Risk level</span>${badge(cart.cartRiskLevelPreview, cart.cartRiskLevelPreview === 'low' ? 'ok' : cart.cartRiskLevelPreview === 'high' ? 'bad' : 'warn')}</div>`
      + `<div class="dp-row"><span>Subtotal</span><b>${money(cart.cartSubtotalPreview)}</b></div>`
      + `<div class="dp-row"><span>Credit available</span><b>${money(cart.creditAvailablePreview)}</b></div>`
      + (cart.riskFlagsPreview || []).map((f) => `<div class="dp-row"><span>${esc(f)}</span>${badge('flag', 'warn')}</div>`).join('')
    : '<div class="dp-empty">No cart risk preview.</div>';

  $('#dp-quote-compare').innerHTML = (quoteCompare && quoteCompare.ok)
    ? (quoteCompare.scenariosPreview || []).map((s) => `<div class="dp-row"><span>${esc(s.labelPreview)}</span><b>${money(s.unitPricePreview)}</b></div>`).join('')
      + `<div class="dp-row"><span>Best</span>${badge(quoteCompare.bestOptionPreview, 'ok')}</div>`
    : '<div class="dp-empty">No comparison preview.</div>';

  rows('#dp-eta-risk', eta.deliveryEtaRiskPreview, (d) => `<div class="dp-row"><span class="id">${esc(d.deliveryIdPreview)}</span><span>${esc(d.carrierSafe)}</span>${badge('ETA ' + d.etaRiskPreview, d.etaRiskPreview === 'low' ? 'ok' : 'bad')}</div>`);
  rows('#dp-claim-pipeline', claims.claimPipelinePreview, (c) => `<div class="dp-row"><span class="id">${esc(c.claimIdPreview)}</span><span>${esc(c.typeSafe)}</span>${badge(c.stagePreview, statusClass(c.stagePreview))}</div>`);
}

// Draft preview actions
const DRAFTS = {
  bulk: () => api('/bulk-order-draft-preview', 'POST', { items: [{ productId: 'prod_1', qty: 60 }, { productId: 'prod_3', qty: 100 }] }),
  quotation: () => api('/quotation-request-preview', 'POST', { items: [{ productId: 'prod_1', qty: 60 }] }),
  payment: () => api('/payment-query-preview', 'POST', { invoiceId: 'inv_2001', subject: 'Payment confirmation', message: 'Please confirm receipt of payment.' }),
  support: () => api('/support-request-preview', 'POST', { subject: 'Dealer query', message: 'I have a question about my account.' }),
  message: () => api('/message-draft-preview', 'POST', { message: 'Hello, this is a preview message.' }),
  document: () => api('/document-request-preview', 'POST', { documentId: 'doc_6001' }),
  dynamicPrice: () => api('/dynamic-pricing-preview', 'POST', { productId: 'prod_1', qty: 120 }),
  bulkImport: () => api('/bulk-import-preview', 'POST', { csv: 'productId,qty\nprod_1,60\nprod_3,100\nprod_2,5' }),
  quoteNegotiation: () => api('/quote-negotiation-preview', 'POST', { requestedDiscount: 15 }),
  reorder: () => api('/reorder-suggestion-preview', 'POST', {}),
  substitution: () => api('/product-substitution-preview', 'POST', { productId: 'prod_2' }),
  crossSell: () => api('/cross-sell-upsell-preview', 'POST', { productId: 'prod_1' }),
  dispute: () => api('/dispute-preview', 'POST', { invoiceId: 'inv_2001', reason: 'Amount mismatch', message: 'Please review the invoice total.' }),
  lead: () => api('/lead-registration-preview', 'POST', { company: 'Prospect Retail', estimatedValue: 250000 }),
  deal: () => api('/deal-registration-preview', 'POST', { name: 'Bulk Supply Q3', value: 600000 }),
  channelConflict: () => api('/channel-conflict-preview', 'POST', { region: 'South' }),
  aiInsight: () => api('/ai-insight-preview', 'POST', {}),
  priceProtection: () => api('/price-protection-preview', 'POST', { productId: 'prod_1' }),
  cartRisk: () => api('/cart-risk-preview', 'POST', { items: [{ productId: 'prod_1', qty: 60 }, { productId: 'prod_2', qty: 5 }] }),
  quoteComparison: () => api('/dealer-quote-comparison-preview', 'POST', { productId: 'prod_1' }),
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
  await loadAdvanced();
  await loadAdvanced2();
})();
