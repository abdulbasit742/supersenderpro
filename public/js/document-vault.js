 'use strict';
 const API = '/api/document-vault';
 const $ = (s) => document.querySelector(s);
 async function j(u, o) { try { const r = await fetch(u, o); return await r.json(); } catch (e) { return { ok: false,
 error: 'unavailable' }; } }
 function esc(s) { return String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&', '<': '<', '>': '>' }[c])); }
 const JH = { method: 'POST', headers: { 'Content-Type': 'application/json' } };
 let DOCS = [];


 async function loadStatus() { const s = await j(API + '/status'); const dry = !s || s.dryRun !== false; $('#dv-badge').textContent = dry ? 'DRY-RUN · no raw export · no external storage · no public sharing · metadata redacted' :
 'CHECK CONFIG'; $('#dv-badge').className = 'dv-badge ' + (dry ? 'safe' : 'warn'); }


 async function loadKpis() {
   const s = await j(API + '/summary');
   const cards = [['Documents', s.totalDocumentsPreview], ['Verified', s.verifiedDocumentsPreview], ['Missing req',
 s.missingRequiredPreview], ['Expiring', s.expiringSoonPreview], ['Expired', s.expiredPreview], ['Compliance',
 (s.complianceScorePreview || 0) + '%']];
   $('#dv-kpis').innerHTML = cards.map(([l, v]) => '<div class="dv-card"><span class="dv-label">' + esc(l) + '</span><span class="dv-value">' + esc(v) + '</span></div>').join('');
 }

 async function loadDocs() {
     const r = await j(API + '/documents'); DOCS = r.documents || [];
     const cats = Array.from(new Set(DOCS.map((d) => d.category)));
   $('#dv-category').innerHTML = '<option value="">All categories</option>' + cats.map((c) => '<option>' + esc(c) +
 '</option>').join('');
   const ml = await j(API + '/module-links'); $('#miss-module').innerHTML = (ml.modules || []).filter((m) =>
 m.requiredDocs.length).map((m) => '<option value="' + esc(m.module) + '">' + esc(m.module) + '</option>').join('');
     renderRows();
 }
 function renderRows() {
   const q = ($('#dv-search').value || '').toLowerCase();
     const c = $('#dv-category').value, st = $('#dv-status').value, rk = $('#dv-risk').value;
     const rows = DOCS.filter((d) => (!q || (d.title + d.documentType).toLowerCase().includes(q)) && (!c || d.category ===
 c) && (!st || d.status === st) && (!rk || d.riskLevel === rk));
   $('#dv-rows').innerHTML = rows.map((d) => '<tr class="drow" data-id="' + esc(d.id) + '"><td>' + esc(d.title) + '</td><td>' + esc(d.documentType.replace('_preview', '')) + '</td><td>' + esc(d.sourceModule || '-') + '</td><td>' +
 esc(d.expiryDate || '-') + '</td><td><span class="badge st-' + esc(d.status) + '">' + esc(d.status) + '</span></td></tr>').join('') || '<tr><td colspan="5" class="muted">No documents match.</td></tr>';
 }


 async function showDetail(id) {
     const r = await j(API + '/documents/' + id); const d = r.document; if (!d) return;
     $('#dv-detail').innerHTML = '<h3>' + esc(d.title) + '</h3><div class="kv">type: ' + esc(d.documentType) + '</div><div class="kv">category: ' + esc(d.category) + '</div><div class="kv">module: ' + esc(d.sourceModule || '-') + ' · record ' +
 esc(d.linkedRecordIdPreview || '-') + '</div><div class="kv">file: ' + esc(d.fileNameSafe || '-') + ' (' +

 esc(d.fileType) + ', ' + esc(d.fileSizePreview) + ')</div><div class="kv">owner: ' + esc(d.ownerSafe || '-') + '</div><div class="kv">expiry: ' + esc(d.expiryDate || '-') + '</div><div class="kv">status: <span class="badge st-' + esc(d.status) + '">' + esc(d.status) + '</span></div>';
 }


 function showTab(tab) { document.querySelectorAll('.dv-tabs button').forEach((b) => b.classList.toggle('active',
 b.dataset.tab === tab)); document.querySelectorAll('.dv-tab').forEach((s) => (s.hidden = true)); $('#tab-' + tab).hidden
 = false; if (tab === 'expiry') loadExpiry(); if (tab === 'audit') loadAudit(); }
 async function loadExpiry() { const r = await j(API + '/expiry-alerts'); $('#expiry-list').innerHTML = '<h4>Expired</h4>'
 + ((r.expiredPreview || []).map((x) => '<div class="line"><span class="badge st-expired">expired</span> ' + esc(x.title)
 + ' · ' + esc(x.daysOverdue) + 'd overdue</div>').join('') || '<p class="muted">None.</p>') + '<h4>Expiring soon</h4>' +
 ((r.expiringSoonPreview || []).map((x) => '<div class="line"><span class="badge st-expiring_soon">soon</span> ' +
 esc(x.title) + ' · ' + esc(x.daysLeft) + 'd left</div>').join('') || '<p class="muted">None.</p>'); }
 async function loadAudit() { $('#audit-result').textContent = JSON.stringify(await j(API + '/audit-trail-preview'), null,
 2); }


 document.addEventListener('click', async (e) => {
     if (e.target.closest('.dv-tabs button')) showTab(e.target.closest('button').dataset.tab);
     const row = e.target.closest('.drow'); if (row) showDetail(row.dataset.id);
   if (e.target.id === 'miss-run') { const r = await j(API + '/missing-check-preview', Object.assign({ body:
 JSON.stringify({ sourceModule: $('#miss-module').value }) }, JH)); $('#miss-result').textContent = JSON.stringify(r,
 null, 2); }
   if (e.target.id === 'ev-run') { const r = await j(API + '/compliance-evidence'); $('#ev-result').innerHTML = '<div class="muted">Compliance score: ' + esc(r.complianceScorePreview) + '%</div><h4>Present</h4>' + (r.evidenceItemsPreview
 || []).map((x) => '<div class="line">' + esc(x.area) + ' · ' + esc(x.documentType) + '</div>').join('') +
 '<h4>Missing</h4>' + ((r.missingEvidencePreview || []).map((x) => '<div class="line"><span class="badge st-missing_required">missing</span> ' + esc(x.area) + ' · ' + esc(x.documentType) + '</div>').join('') || '<p class="muted">None.</p>'); }
   if (e.target.id === 'acc-run') { const r = await j(API + '/access-check-preview', Object.assign({ body:
 JSON.stringify({ documentId: $('#acc-doc').value, role: $('#acc-role').value }) }, JH)); $('#acc-result').textContent =
 JSON.stringify(r, null, 2); }
   if (e.target.id === 'sh-run') { const r = await j(API + '/documents/' + $('#sh-doc').value + '/share-draft-preview',
 Object.assign({ body: JSON.stringify({ recipient: $('#sh-to').value }) }, JH)); $('#sh-result').textContent =
 JSON.stringify(r, null, 2); }
 });
 document.addEventListener('input', (e) => { if (['dv-search', 'dv-category', 'dv-status', 'dv-risk'].includes(e.target.id)) renderRows(); });


 (async function () { await loadStatus(); await loadKpis(); await loadDocs(); })();
