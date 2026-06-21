 'use strict';
 const API = '/api/supplier-portal';
 const $ = (s) => document.querySelector(s);
 async function j(u, o) { try { const r = await fetch(u, o); return await r.json(); } catch (e) { return { ok: false,
 error: 'unavailable' }; } }
 function esc(s) { return String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&', '<': '<', '>': '>' }[c])); }

 const JH = { method: 'POST', headers: { 'Content-Type': 'application/json' } };
 let TOKEN = null;
 function show(id, on) { const el = $(id); if (el) el.hidden = !on; }


 async function loadStatus() { const s = await j(API + '/status'); const dry = !s || s.dryRun !== false; $('#sp-badge').textContent = dry ? 'DRY-RUN · preview only · no payment · no live submit · bank/tax masked' : 'CHECK CONFIG';
 $('#sp-badge').className = 'sp-badge ' + (dry ? 'safe' : 'warn'); }

 async function loadSuppliers() { const r = await j(API + '/suppliers'); $('#sp-supplier').innerHTML = (r.suppliers ||
 []).map((s) => '<option value="' + esc(s.previewToken) + '">' + esc(s.displayNameSafe) + ' (' + esc(s.previewToken) + ')</option>').join(''); show('#sp-empty', true); }

 async function loadSummary() {
     TOKEN = $('#sp-supplier').value; if (!TOKEN) return;
     ['#sp-empty', '#sp-error', '#sp-summary', '#sp-areas', '#sp-actions'].forEach((s) => show(s, false)); show('#sp-loading', true);
   const r = await j(API + '/suppliers/' + TOKEN + '/summary-preview');
     show('#sp-loading', false);
     if (!r || r.ok === false) { show('#sp-error', true); return; }
     const sp = r.summaryPreview || {};
     const v = sp.supplier || {};
   $('#sp-summary').innerHTML = '<div class="sp-cust"><strong>' + esc(v.displayNameSafe) + '</strong> <span class="muted">' + esc(v.phoneMasked || '') + ' · ' + esc(v.emailMasked || '') + '</span></div><div class="muted">Bank: '
 + esc(v.bankMasked || '-') + ' · Tax: ' + esc(v.taxMasked || '-') + ' · Quality: ' + esc(sp.qualityScorePreview) + ' · Attention: ' + esc((sp.attentionAreas || []).join(', ') || 'none') + '</div>';
   $('#sp-areas').innerHTML = Object.entries(sp.statuses || {}).map(([area, st]) => '<div class="sp-area"><span class="sp-area-name">' + esc(area.replace(/_/g, ' ')) + '</span><span class="badge st-' + esc(st) + '">' + esc(st) + '</span></div>').join('');
   show('#sp-summary', true); show('#sp-areas', true); show('#sp-actions', true);
 }

 document.addEventListener('click', async (e) => {
   if (e.target.id === 'sp-load') loadSummary();
     if (!TOKEN && ['q-preview', 'pay-preview', 'sr-preview', 'msg-draft'].includes(e.target.id)) return;
     if (e.target.id === 'q-preview') { const r = await j(API + '/suppliers/' + TOKEN + '/quote-submit-preview',
 Object.assign({ body: '{}' }, JH)); $('#q-out').textContent = 'Preview only (not submitted): ' +
 JSON.stringify(r.detailPreview || r, null, 2); }
   if (e.target.id === 'pay-preview') { const r = await j(API + '/suppliers/' + TOKEN + '/payment-query-preview',
 Object.assign({ body: '{}' }, JH)); $('#pay-out').textContent = 'Preview only (no payment): status ' +
 esc(r.statusPreview) + ' · livePaymentAction ' + r.livePaymentAction; }
   if (e.target.id === 'sr-preview') { const r = await j(API + '/suppliers/' + TOKEN + '/support-request-preview',
 Object.assign({ body: JSON.stringify({ subject: $('#sr-subject').value, body: $('#sr-body').value }) }, JH)); $('#sr-out').textContent = 'Preview only (no ticket): ' + JSON.stringify(r.requestPreview || r, null, 2); }
   if (e.target.id === 'msg-draft') { const r = await j(API + '/suppliers/' + TOKEN + '/message-draft-preview',
 Object.assign({ body: JSON.stringify({ text: $('#msg-text').value, channel: 'whatsapp_preview' }) }, JH)); $('#msg-out').textContent = 'Draft only (not sent): ' + esc(r.messagePreview || '') + ' → ' + esc(r.recipientMasked || ''); }
 });


 (async function () { await loadStatus(); await loadSuppliers(); })();
