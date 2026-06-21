  'use strict';
  const API = '/api/cashbook-center';
  const $ = (s) => document.querySelector(s);
  async function j(u, o) { try { const r = await fetch(u, o); return await r.json(); } catch (e) { return { ok: false,
  error: 'unavailable' }; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&', '<': '<', '>': '>' }[c])); }
  const JH = { method: 'POST', headers: { 'Content-Type': 'application/json' } };
  let TXNS = [];

  async function loadStatus() { const s = await j(API + '/status'); const dry = !s || s.dryRun !== false; $('#cb-badge').textContent = dry ? 'DRY-RUN · no bank call · no payment action · PII masked' : 'CHECK CONFIG'; $('#cb-badge').className = 'cb-badge ' + (dry ? 'safe' : 'warn'); }

  async function loadKpis() {
    const b = await j(API + '/balance-preview');
    const cards = [['Opening', b.openingBalancePreview], ['Cash in', b.cashInPreview], ['Cash out', b.cashOutPreview],
  ['Closing', b.closingBalancePreview], ['Unmatched', b.unmatchedCount]];
    $('#cb-kpis').innerHTML = cards.map(([l, v]) => '<div class="cb-card"><span class="cb-label">' + esc(l) + '</span><span class="cb-value">' + esc(v) + '</span></div>').join('');
  }


  async function loadTxns() { const r = await j(API + '/transactions'); TXNS = r.transactions || []; renderRows(); }
  function renderRows() {
      const q = ($('#cb-search').value || '').toLowerCase();
      const m = $('#cb-method').value, st = $('#cb-status').value, rk = $('#cb-risk').value;
    const rows = TXNS.filter((t) => (!q || (t.referenceMasked + t.payerNameSafe +
  t.payeeNameSafe).toLowerCase().includes(q)) && (!m || t.method === m) && (!st || t.matchStatus === st) && (!rk ||
  t.riskLevel === rk));
    $('#cb-rows').innerHTML = rows.map((t) => '<tr><td>' + esc(t.transactionDate) + '</td><td><span class="dir ' + esc(t.direction) + '">' + (t.direction === 'cash_in' ? '↓ in' : '↑ out') + '</span></td><td>' + esc(t.amount) + ' ' +
  esc(t.currency) + '</td><td>' + esc(t.method) + '</td><td>' + esc(t.referenceMasked) + '</td><td><span class="badge st-' + esc(t.matchStatus) + '">' + esc(t.matchStatus) + '</span></td></tr>').join('') || '<tr><td colspan="6" class="muted">No transactions match.</td></tr>';
  }


  function showTab(tab) { document.querySelectorAll('.cb-tabs button').forEach((b) => b.classList.toggle('active',
  b.dataset.tab === tab)); document.querySelectorAll('.cb-tab').forEach((s) => (s.hidden = true)); $('#tab-' + tab).hidden
  = false; }


  document.addEventListener('click', async (e) => {
    if (e.target.closest('.cb-tabs button')) showTab(e.target.closest('button').dataset.tab);
    if (e.target.id === 'match-run') { const r = await j(API + '/match-preview', Object.assign({ body: JSON.stringify({
  transactionId: $('#match-id').value }) }, JH)); $('#match-result').textContent = JSON.stringify(r, null, 2); }
    if (e.target.id === 'dupe-run') { const r = await j(API + '/duplicate-check-preview', JH); $('#dupe-list').innerHTML =
  '<div class="muted">Duplicate risks: ' + esc(r.duplicateRisksPreview) + '</div>' + (r.duplicates || []).map((d) => '<div class="line"><span class="badge risk-' + esc(d.riskLevel) + '">' + esc(d.riskLevel) + '</span> ' + esc(d.pair.join(' ↔')) + ' · ' + esc(d.amount) + ' · ' + esc(d.reason) + '</div>').join(''); }
    if (e.target.id === 'recon-run') { const r = await j(API + '/reconcile-preview', Object.assign({ body: JSON.stringify({
  statementLines: [] }) }, JH)); $('#recon-result').textContent = JSON.stringify(r, null, 2); }
    if (e.target.id === 'ledger-run') { const r = await j(API + '/accounting-link-preview', Object.assign({ body:
  JSON.stringify({ transactionId: $('#ledger-id').value }) }, JH)); $('#ledger-result').textContent = JSON.stringify(r,
  null, 2); }

  });
  document.addEventListener('input', (e) => { if (['cb-search', 'cb-method', 'cb-status', 'cb-risk'].includes(e.target.id))
  renderRows(); });


  async function loadUnmatched() { const r = await j(API + '/unmatched'); $('#unmatched-list').innerHTML = (r.unmatched ||
  []).map((t) => '<div class="line"><strong>' + esc(t.amount) + '</strong> · ' + esc(t.method) + ' · ' +
  esc(t.referenceMasked) + ' · ' + esc(t.matchStatus) + '</div>').join('') || '<p class="muted">All matched.</p>'; }


  (async function () { await loadStatus(); await loadKpis(); await loadTxns(); await loadUnmatched(); })();
