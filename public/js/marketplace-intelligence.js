/* Marketplace Intelligence dashboard client. */
const API = '/api/marketplace-intelligence';
const ADMIN_SECRET = localStorage.getItem('miAdminSecret') || '';
function headers() { const h = { 'Content-Type': 'application/json' }; if (ADMIN_SECRET) h['x-admin-secret'] = ADMIN_SECRET; return h; }
async function getJSON(u) { const r = await fetch(u, { headers: headers() }); return r.json(); }
async function postJSON(u, b) { const r = await fetch(u, { method: 'POST', headers: headers(), body: JSON.stringify(b || {}) }); return r.json(); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }
function toast(m) { const t = document.getElementById('toast'); t.textContent = m; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2600); }

async function loadStatus() {
  const d = await getJSON(`${API}/status`); const s = d.status || {};
  const m = document.getElementById('mode'); m.textContent = s.dryRun ? 'DRY-RUN' : 'LIVE'; m.className = 'mode ' + (s.dryRun ? 'dry' : 'live');
  const cards = [
    ['Sellers', s.sellersTracked], ['Buyers', s.buyersTracked], ['SKUs', s.skusTracked],
    ['Offers Today', s.offersToday], ['Requests Today', s.buyerRequestsToday], ['Stock Updates', s.stockUpdates],
    ['Price Changes', s.priceChanges], ['High-Risk Posts', s.highRiskPosts], ['AI Opportunities', s.aiOpportunities]
  ];
  document.getElementById('cards').innerHTML = cards.map(c => `<div class="card"><div class="num">${c[1] || 0}</div><div class="lbl">${c[0]}</div></div>`).join('');
}
async function loadSellers() {
  const d = await getJSON(`${API}/sellers`);
  document.getElementById('sellersBody').innerHTML = (d.sellers || []).slice(0, 25).map(s => `<tr><td>${esc(s.sellerNameSafe)}</td><td><span class="pill ${s.trustBand}">${s.trustScore}</span></td><td>${s.rankScore}</td><td>${s.productsOffered}</td><td class="risk">${(s.riskFlags || []).join(', ')}</td></tr>`).join('') || '<tr><td colspan="5">No sellers yet.</td></tr>';
}
async function loadBuyers() {
  const d = await getJSON(`${API}/buyers`);
  document.getElementById('buyersBody').innerHTML = (d.buyers || []).sort((a, b) => b.conversionScore - a.conversionScore).slice(0, 25).map(b => `<tr><td>${esc(b.buyerNameSafe)}</td><td>${b.conversionScore}</td><td><span class="pill ${b.conversionBand}">${b.conversionBand}</span></td><td>${b.requests}</td><td>${esc(b.urgency)}</td></tr>`).join('') || '<tr><td colspan="5">No buyers yet.</td></tr>';
}
async function loadPrices() {
  const d = await getJSON(`${API}/prices`);
  document.getElementById('pricesBody').innerHTML = (d.prices || []).slice(0, 30).map(p => `<tr><td>${esc(p.sku)}</td><td>${p.latest}</td><td>${p.min}</td><td>${p.avg}</td><td>${p.max}</td><td>${p.sellerCount}</td></tr>`).join('') || '<tr><td colspan="6">No prices yet.</td></tr>';
}
async function loadStock() {
  const d = await getJSON(`${API}/stock`);
  document.getElementById('stockBody').innerHTML = (d.stock || []).slice(0, 30).map(s => `<tr><td>${esc(s.sku)}</td><td><span class="pill ${s.latestSignal}">${esc(s.latestSignal)}</span></td><td>${s.updates}</td></tr>`).join('') || '<tr><td colspan="3">No stock signals.</td></tr>';
}
async function loadOpps() {
  const d = await getJSON(`${API}/opportunities`);
  document.getElementById('oppsBody').innerHTML = (d.opportunities || []).map(o => `<tr><td>${esc(o.type)}</td><td>${esc(o.sku || '')}</td><td>${esc([o.marginPct ? o.marginPct + '% margin' : '', o.demandCount ? o.demandCount + ' buyers' : '', o.changePct ? o.changePct + '%' : ''].filter(Boolean).join(' · '))}</td><td>${o.confidence}</td></tr>`).join('') || '<tr><td colspan="4">No opportunities yet.</td></tr>';
}
async function loadRecs() {
  const d = await getJSON(`${API}/recommendations`);
  document.getElementById('recsBox').textContent = (d.recommendations || []).map(r => `• [${r.type}] ${r.suggestion} (→ ${r.action})`).join('\n') || 'No recommendations.';
}
async function loadHistory() {
  const d = await getJSON(`${API}/history?limit=40`);
  document.getElementById('historyBox').textContent = (d.history || []).slice().reverse().map(h => `${(h.ts || '').slice(11, 19)}  ${h.event} ${h.sourceType || ''} (${h.signals || 0})`).join('\n') || 'No activity yet.';
}
async function search() {
  const query = document.getElementById('searchBox').value.trim();
  const type = document.getElementById('searchType').value;
  const riskOnly = document.getElementById('riskFilter').value === '1';
  const city = document.getElementById('cityFilter').value.trim();
  const body = { query, riskOnly };
  if (type) body.types = [type];
  if (city) body.city = city;
  const d = await postJSON(`${API}/search`, body);
  document.getElementById('searchResults').innerHTML = (d.results || []).map(r => `<span class="res">${esc(r.type)}: ${esc(r.label)}${(r.riskFlags || []).length ? ' ⚠️' : ''}</span>`).join('') || '<span class="res">No matches.</span>';
}
async function genDigest() { const d = await getJSON(`${API}/digest`); alert((d.digest && d.digest.text) || 'No digest'); }
function exportReport(fmt) { window.open(`${API}/report?kind=all&format=${fmt}`, '_blank'); }

async function refreshAll() { await Promise.all([loadStatus(), loadSellers(), loadBuyers(), loadPrices(), loadStock(), loadOpps(), loadRecs(), loadHistory()]); toast('Refreshed'); }

window.MI = { refreshAll, search, genDigest, exportReport };
refreshAll();
setInterval(loadStatus, 20000);
