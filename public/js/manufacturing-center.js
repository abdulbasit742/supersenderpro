  'use strict';
  const API = '/api/manufacturing-center';
  const $ = (s) => document.querySelector(s);
  async function j(u, o) { try { const r = await fetch(u, o); return await r.json(); } catch (e) { return { ok: false,
  error: 'unavailable' }; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&', '<': '<', '>': '>' }[c])); }
  const JH = { method: 'POST', headers: { 'Content-Type': 'application/json' } };
  let BOMS = [];

  async function loadStatus() { const s = await j(API + '/status'); const dry = !s || s.dryRun !== false; $('#mc-badge').textContent = dry ? 'DRY-RUN · no stock mutation · no production completion · no ledger write' : 'CHECK CONFIG';
  $('#mc-badge').className = 'mc-badge ' + (dry ? 'safe' : 'warn'); }


  async function loadKpis() {
      const s = await j(API + '/summary');
      const cards = [['BOMs', s.totalBomsPreview], ['Prod orders', s.totalProductionOrdersPreview], ['Shortages',
  s.materialShortageCountPreview], ['Prod cost', s.productionCostPreview], ['FG value', s.finishedGoodsValuePreview],
  ['High risk', s.highRiskOrdersPreview]];
    $('#mc-kpis').innerHTML = cards.map(([l, v]) => '<div class="mc-card"><span class="mc-label">' + esc(l) + '</span><span class="mc-value">' + esc(v) + '</span></div>').join('');
  }

  async function loadBoms() { const r = await j(API + '/boms'); BOMS = r.boms || []; renderBoms(); }
  function renderBoms() {
      const q = ($('#mc-search').value || '').toLowerCase();
      const rows = BOMS.filter((b) => !q || (b.finishedProductName + b.finishedSku).toLowerCase().includes(q));
    $('#bom-list').innerHTML = rows.map((b) => '<div class="line"><strong>' + esc(b.finishedProductName) + '</strong> <span class="muted">' + esc(b.finishedSku) + ' · ' + esc(b.id) + '</span><div class="muted">components: ' + (b.components ||
  []).length + ' · cost ' + esc(b.totalCostPreview) + ' · margin ' + esc(b.marginPreview) + '%' + ((b.components ||
  []).some((c) => c.shortagePreview > 0) ? ' · <span class="badge risk-high">shortage</span>' : '') + '</div></div>').join('') || '<p class="muted">No BOMs.</p>';
  }

  async function loadOrders() {
    const params = new URLSearchParams(); if ($('#mc-status').value) params.set('status', $('#mc-status').value); if
  ($('#mc-risk').value) params.set('riskLevel', $('#mc-risk').value);
      const r = await j(API + '/production-orders?' + params.toString());
      $('#order-list').innerHTML = (r.orders || []).map((o) => '<div class="line"><strong>' + esc(o.productionNumber) +
  '</strong> <span class="muted">bom ' + esc(o.bomId) + ' · qty ' + esc(o.quantityToProduce) + ' · ' + esc(o.status) +
  '</span> <span class="badge risk-' + esc(o.riskLevel) + '">' + esc(o.riskLevel) + '</span></div>').join('') || '<p class="muted">No orders.</p>';
  }

  function showTab(tab) { document.querySelectorAll('.mc-tabs button').forEach((b) => b.classList.toggle('active',

  b.dataset.tab === tab)); document.querySelectorAll('.mc-tab').forEach((s) => (s.hidden = true)); $('#tab-' + tab).hidden
  = false; if (tab === 'orders') loadOrders(); }

  document.addEventListener('click', async (e) => {
    if (e.target.closest('.mc-tabs button')) showTab(e.target.closest('button').dataset.tab);
    if (e.target.id === 'mat-run') { const r = await j(API + '/boms/' + $('#mat-bom').value + '/material-check-preview',
  Object.assign({ body: JSON.stringify({ quantityToProduce: parseFloat($('#mat-qty').value) || 1 }) }, JH)); $('#mat-result').textContent = JSON.stringify(r, null, 2); }
    if (e.target.id === 'cost-run') { const r = await j(API + '/profit-margin-preview', Object.assign({ body:
  JSON.stringify({ bomId: $('#cost-bom').value, quantityToProduce: parseFloat($('#cost-qty').value) || 1, salePricePerUnit:
  parseFloat($('#cost-price').value) || undefined }) }, JH)); $('#cost-result').textContent = JSON.stringify(r, null, 2); }
    if (e.target.id === 'batch-run') { const r = await j(API + '/batch-production-preview', Object.assign({ body:
  JSON.stringify({ bomId: $('#batch-bom').value, quantityToProduce: parseFloat($('#batch-qty').value) || 1, batchSize:
  parseFloat($('#batch-size').value) || undefined }) }, JH)); $('#batch-result').textContent = JSON.stringify(r, null, 2);
  }
    if (e.target.id === 'inv-run') { const r = await j(API + '/inventory-impact-preview', Object.assign({ body:
  JSON.stringify({ bomId: $('#inv-bom').value, quantityToProduce: parseFloat($('#inv-qty').value) || 1 }) }, JH)); $('#inv-result').textContent = JSON.stringify(r, null, 2); }
    if (e.target.id === 'risk-run') { const r = await j(API + '/risks'); $('#risk-list').innerHTML = (r.risks ||
  []).map((x) => '<div class="line"><strong>' + esc(x.productionOrderId) + '</strong> <span class="badge risk-' + esc(x.riskLevel) + '">' + esc(x.riskLevel) + '</span><div class="muted">' + esc((x.signals || []).join(', ')) + '</div></div>').join(''); }
    if (e.target.id === 'acc-run') { const r = await j(API + '/accounting-impact-preview', Object.assign({ body:
  JSON.stringify({ bomId: $('#acc-bom').value, quantityToProduce: parseFloat($('#acc-qty').value) || 1 }) }, JH)); $('#acc-result').textContent = JSON.stringify(r, null, 2); }
  });
  document.addEventListener('input', (e) => { if (e.target.id === 'mc-search') renderBoms(); if (['mc-status', 'mc-risk'].includes(e.target.id)) loadOrders(); });


  (async function () { await loadStatus(); await loadKpis(); await loadBoms(); })();
