'use strict';
const API = '/api/tax-compliance';
const $ = (s) => document.querySelector(s);
async function j(u, o) { try { const r = await fetch(u, o); return await r.json(); } catch (e) { return { ok: false,
error: 'unavailable' }; } }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&', '<': '<', '>': '>' }[c])); }
const JH = { method: 'POST', headers: { 'Content-Type': 'application/json' } };

async function loadStatus() { const s = await j(API + '/status'); const dry = !s || s.dryRun !== false; $('#tx-badge').textContent = dry ? 'DRY-RUN · no tax filing · no government API · PII masked' : 'CHECK CONFIG'; $('#tx-badge').className = 'tx-badge ' + (dry ? 'safe' : 'warn'); }

async function loadKpis() {
   const s = await j(API + '/summary');
   const cards = [['Tax rules', s.taxRules], ['Tax collected', s.totalTaxCollectedPreview], ['Tax paid',
s.totalTaxPaidPreview], ['Net payable', s.monthlyNetTaxPayablePreview], ['Risk', s.riskLevel], ['Checklist',
s.checklistReady ? 'ready' : 'review']];
 $('#tx-kpis').innerHTML = cards.map(([l, v]) => '<div class="tx-card"><span class="tx-label">' + esc(l) + '</span><span class="tx-value">' + esc(v) + '</span></div>').join('');
}

async function loadRules() { const r = await j(API + '/rules'); $('#rules-list').innerHTML = (r.rules || []).map((x) =>
'<div class="line"><strong>' + esc(x.name) + '</strong> · ' + esc(x.taxType) + ' · ' + esc(x.ratePercent) + '% · ' +
esc((x.appliesTo || []).join(', ')) + ' <span class="badge st-' + esc(x.status) + '">' + esc(x.status) + '</span></div>').join(''); }


function showTab(tab) { document.querySelectorAll('.tx-tabs button').forEach((b) => b.classList.toggle('active',
b.dataset.tab === tab)); document.querySelectorAll('.tx-tab').forEach((s) => (s.hidden = true)); $('#tab-' + tab).hidden
= false; if (tab === 'reports') loadReports(); if (tab === 'checklist') loadChecklist(); if (tab === 'risk') loadRisk();
}
async function loadReports() { $('#rep-monthly').textContent = JSON.stringify(await j(API + '/reports/monthly'), null,
2); $('#rep-quarterly').textContent = JSON.stringify(await j(API + '/reports/quarterly'), null, 2); }
async function loadChecklist() { const r = await j(API + '/checklist'); $('#checklist-list').innerHTML = '<div class="muted">' + (r.passed || 0) + '/' + (r.total || 0) + ' passed · ' + (r.ready ? 'ready' : 'review') + '</div>' +
(r.items || []).map((i) => '<div class="line"><span class="badge st-' + esc(i.status) + '">' + esc(i.status) + '</span> '
+ esc(i.label) + (i.required ? ' <span class="req">required</span>' : '') + '</div>').join(''); }
async function loadRisk() { $('#risk-result').textContent = JSON.stringify(await j(API + '/risk-check'), null, 2); }


document.addEventListener('click', async (e) => {
   if (e.target.closest('.tx-tabs button')) showTab(e.target.closest('button').dataset.tab);
   if (e.target.id === 'calc-run') { const r = await j(API + '/calculate-preview', Object.assign({ body: JSON.stringify({
subtotal: parseFloat($('#calc-sub').value), taxRatePercent: parseFloat($('#calc-rate').value), exempt: $('#calc-exempt').checked }) }, JH)); $('#calc-result').textContent = JSON.stringify(r, null, 2); }
 if (e.target.id === 'inv-run') { const r = await j(API + '/invoice-tax-preview', Object.assign({ body: '{}' }, JH));
$('#inv-result').innerHTML = '<div class="muted">Collected: ' + esc(r.totalTaxCollectedPreview) + ' · taxable rev ' +
esc(r.taxableRevenuePreview) + ' · exempt ' + esc(r.exemptRevenuePreview) + '</div>' + (r.lines || []).map((l) => '<div class="line">' + esc(l.invoiceId) + ' · ' + esc(l.appliesTo) + ' · sub ' + esc(l.subtotalPreview) + ' · ' +
esc(l.taxRatePreview) + '% · tax ' + esc(l.taxAmountPreview) + (l.exempt ? ' <span class="badge st-warn">exempt</span>' :
'') + '</div>').join(''); }
 if (e.target.id === 'exp-run') { const r = await j(API + '/expense-tax-preview', Object.assign({ body: '{}' }, JH));
$('#exp-result').innerHTML = '<div class="muted">Paid: ' + esc(r.totalTaxPaidPreview) + ' · taxable expenses ' +
esc(r.taxableExpensesPreview) + '</div>' + (r.lines || []).map((l) => '<div class="line">' + esc(l.expenseId) + ' · ' +
esc(l.appliesTo) + ' · sub ' + esc(l.subtotalPreview) + ' · ' + esc(l.taxRatePreview) + '% · tax ' +
esc(l.taxAmountPreview) + '</div>').join(''); }
 if (e.target.id === 'audit-run') { const r = await j(API + '/audit-export-preview', Object.assign({ body:
JSON.stringify({ period: 'monthly_preview' }) }, JH)); $('#audit-result').textContent = JSON.stringify(r, null, 2); }

  });


  (async function () { await loadStatus(); await loadKpis(); await loadRules(); })();
