 'use strict';
 const API = '/api/product-business-intelligence';
 const $ = (s) => document.querySelector(s);
 async function j(u, o) { try { const r = await fetch(u, o); return await r.json(); } catch (e) { return { ok: false,
 error: 'unavailable' }; } }
 function esc(s) { return String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&', '<': '<', '>': '>' }[c])); }
 const JH = { method: 'POST', headers: { 'Content-Type': 'application/json' } };
 let PRODUCTS = [];

 async function loadStatus() { const s = await j(API + '/status'); const dry = !s || s.dryRun !== false; $('#pbi-badge').textContent = dry ? 'DRY-RUN · no stock mutation · no payment action · no external calls' : 'CHECK CONFIG';
 $('#pbi-badge').className = 'pbi-badge ' + (dry ? 'safe' : 'warn'); }

 async function loadKpis() {
   const s = await j(API + '/summary');
     const cards = [
       ['Products', s.totalProducts], ['Stock value', s.totalStockValuePreview], ['Revenue', s.totalRevenuePreview],
 ['Profit', s.totalProfitPreview], ['Loss', s.totalLossPreview], ['Avg margin', (s.avgMarginPreview || 0) + '%'], ['Low stock', s.lowStockCount], ['Dead stock', s.deadStockCount], ['At risk', s.riskCount],
     ];
     $('#pbi-kpis').innerHTML = cards.map(([l, v]) => '<div class="pbi-card"><span class="pbi-label">' + esc(l) + '</span><span class="pbi-value">' + esc(v) + '</span></div>').join('');
 }

 async function loadProducts() {
     const r = await j(API + '/products'); PRODUCTS = r.products || [];
     const cats = Array.from(new Set(PRODUCTS.map((p) => p.category)));
   $('#pbi-filter-cat').innerHTML = '<option value="">All categories</option>' + cats.map((c) => '<option>' + esc(c) +
 '</option>').join('');
     renderRows();
 }


 function renderRows() {
     const q = ($('#pbi-search').value || '').toLowerCase();
     const st = $('#pbi-filter-status').value; const rk = $('#pbi-filter-risk').value; const cat = $('#pbi-filter-cat').value;
   const rows = PRODUCTS.filter((p) => (!q || (p.name + p.sku).toLowerCase().includes(q)) && (!st || p.stockStatus === st)
 && (!rk || p.riskLevel === rk) && (!cat || p.category === cat));
   $('#pbi-rows').innerHTML = rows.map((p) => '<tr class="prow" data-id="' + esc(p.id) + '"><td>' + esc(p.name) + '<div class="muted">' + esc(p.sku) + '</div></td><td>' + esc(p.category) + '</td><td>' + esc(p.stockQty) + '</td><td>' +
 esc(p.marginPreview) + '%</td><td>' + esc(p.businessScore) + '</td><td><span class="dot risk-' + esc(p.riskLevel) + '"></span>' + esc(p.riskLevel) + '</td></tr>').join('') || '<tr><td colspan="6" class="muted">No products match.</td></tr>';
 }


 async function showDetail(id) {
     const r = await j(API + '/products/' + id + '/analyze-preview', JH);
     $('#pbi-detail').innerHTML = '<h3>' + esc(id) + '</h3><div class="kv">inventory: <strong>' + esc(r.inventoryHealth) +
 '</strong></div><div class="kv">revenue: <strong>' + esc(r.revenuePreview) + '</strong></div><div class="kv">profit:<strong>' + esc(r.profitPreview) + '</strong></div><div class="kv">loss: <strong>' + esc(r.lossPreview) + '</strong></div><div class="kv">margin: <strong>' + esc(r.marginPreview) + '%</strong></div><div class="kv">score: <strong>' +
 esc(r.businessScore) + '</strong> · risk <span class="dot risk-' + esc(r.riskLevel) + '"></span>' + esc(r.riskLevel) +
 '</div><h4>Signals</h4><div class="badges">' + (r.signals || []).map((s) => '<span class="badge sev-' + esc(s.severity) +'">' + esc(s.name) + '</span>').join('') + '</div><h4>Recommendations</h4>' + (r.recommendations || []).map((x) => '<div class="rec">' + esc(x) + '</div>').join('');
 }


 function showTab(tab) { document.querySelectorAll('.pbi-tabs button').forEach((b) => b.classList.toggle('active',
 b.dataset.tab === tab)); document.querySelectorAll('.pbi-tab').forEach((s) => (s.hidden = true)); $('#tab-' + tab).hidden
 = false; }
 function listInto(el, arr, fn) { $(el).innerHTML = (arr || []).map(fn).join('') || '<p class="muted">Nothing here.</p>';
 }

 async function loadTab(tab) {
   if (tab === 'inventory') { const r = await j(API + '/stock-health'); listInto('#inv-list', r.stockHealth, (x) => '<div class="line"><strong>' + esc(x.name) + '</strong> · ' + esc(x.label) + ' (' + esc(x.healthScore) + ') · ' +
 esc(x.stockStatus) + '</div>'); }
   if (tab === 'profit') { const r = await j(API + '/profit-loss'); listInto('#profit-list', r.products, (x) => '<div class="line"><strong>' + esc(x.name) + '</strong> · rev ' + esc(x.revenuePreview) + ' · profit ' + esc(x.profitPreview) +
 ' · loss ' + esc(x.lossPreview) + ' · margin ' + esc(x.marginPreview) + '%</div>'); }
   if (tab === 'dead') { const r = await j(API + '/dead-stock'); listInto('#dead-list', r.deadStock, (x) => '<div class="line"><strong>' + esc(x.name) + '</strong> · ' + esc(x.daysSinceLastSale) + 'd unsold · value ' +
 esc(x.deadStockValuePreview) + '</div>'); }
   if (tab === 'fast') { const r = await j(API + '/fast-movers'); listInto('#fast-list', r.fastMovers, (x) => '<div class="line"><strong>' + esc(x.name) + '</strong> · sold ' + esc(x.soldQtyPreview) + ' · rev ' + esc(x.revenuePreview) +
 (x.restockWatch ? ' · ⚠  restock' : '') + '</div>'); }
   if (tab === 'leakage') { const r = await j(API + '/loss-leakage'); $('#leakage-list').innerHTML = '<div class="muted">Total leakage preview: ' + esc(r.totalLeakagePreview) + '</div>' + (r.leaks || []).map((l) => '<div class="line"><strong>' + esc(l.name) + '</strong> · ' + esc(l.type) + ' · impact ' + esc(l.impactPreview) +
 '</div>').join(''); }
   if (tab === 'risk') { const r = await j(API + '/business-risks'); $('#risk-list').innerHTML = '<div class="muted">Portfolio: ' + esc(JSON.stringify(r.portfolio)) + '</div>' + (r.products || []).map((x) => '<div class="line"><span class="dot risk-' + esc(x.riskLevel) + '"></span><strong>' + esc(x.name) + '</strong> · ' +
 esc(x.riskLevel) + ' · ' + esc((x.reasons || []).join(', ')) + '</div>').join(''); }
   if (tab === 'signals') { const r = await j(API + '/signals'); $('#sig-count').textContent = r.total + ' signals across' + (r.categories || []).length + ' categories (5000+ capable).'; listInto('#sig-list', r.signals, (s) => '<div class="line"><span class="badge sev-' + esc(s.severity) + '">' + esc(s.category) + '</span> <strong>' + esc(s.name) +
 '</strong> <span class="muted">' + esc(s.description) + '</span></div>'); }
 }


 document.addEventListener('click', (e) => {
   if (e.target.closest('.pbi-tabs button')) { const tab = e.target.closest('button').dataset.tab; showTab(tab);
 loadTab(tab); }
   const row = e.target.closest('.prow'); if (row) showDetail(row.dataset.id);
 });
 ['#pbi-search', '#pbi-filter-status', '#pbi-filter-risk', '#pbi-filter-cat'].forEach((sel) =>
 document.addEventListener('input', (e) => { if (e.target.matches(sel)) renderRows(); }));


 (async function () { await loadStatus(); await loadKpis(); await loadProducts(); })();
