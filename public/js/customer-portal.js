 'use strict';
 const API = '/api/customer-portal';
 const $ = (s) => document.querySelector(s);
 async function j(u, o) { try { const r = await fetch(u, o); return await r.json(); } catch (e) { return { ok: false,
 error: 'unavailable' }; } }
 function esc(s) { return String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&', '<': '<', '>': '>' }[c])); }
 const JH = { method: 'POST', headers: { 'Content-Type': 'application/json' } };
 let TOKEN = null;
 function show(id, on) { const el = $(id); if (el) el.hidden = !on; }

 async function loadStatus() { const s = await j(API + '/status'); const dry = !s || s.dryRun !== false; $('#cp-badge').textContent = dry ? 'DRY-RUN · preview only · no payment · no send · PII masked' : 'CHECK CONFIG'; $('#cp-badge').className = 'cp-badge ' + (dry ? 'safe' : 'warn'); }

 async function loadCustomers() { const r = await j(API + '/customers'); $('#cp-customer').innerHTML = (r.customers ||
 []).map((c) => '<option value="' + esc(c.previewToken) + '">' + esc(c.displayNameSafe) + ' (' + esc(c.previewToken) + ')</option>').join(''); show('#cp-empty', true); }


 async function loadSummary() {
   TOKEN = $('#cp-customer').value; if (!TOKEN) return;
   show('#cp-empty', false); show('#cp-error', false); show('#cp-summary', false); show('#cp-areas', false); show('#cp-actions', false); show('#cp-loading', true);
     const r = await j(API + '/customers/' + TOKEN + '/summary-preview');
     show('#cp-loading', false);
     if (!r || r.ok === false) { show('#cp-error', true); return; }
     const sp = r.summaryPreview || {};
   $('#cp-summary').innerHTML = '<div class="cp-cust"><strong>' + esc(sp.customer && sp.customer.displayNameSafe) +
 '</strong> <span class="muted">' + esc((sp.customer && sp.customer.phoneMasked) || '') + ' · ' + esc((sp.customer &&
 sp.customer.emailMasked) || '') + '</span></div><div class="muted">Loyalty points: ' + esc(sp.loyaltyPointsPreview) + ' · Attention: ' + esc((sp.attentionAreas || []).join(', ') || 'none') + '</div>';
   $('#cp-areas').innerHTML = Object.entries(sp.statuses || {}).map(([area, st]) => '<div class="cp-area"><span class="cp-area-name">' + esc(area.replace(/_/g, ' ')) + '</span><span class="badge st-' + esc(st) + '">' + esc(st) + '</span></div>').join('');
   show('#cp-summary', true); show('#cp-areas', true); show('#cp-actions', true);
 }

 document.addEventListener('click', async (e) => {
   if (e.target.id === 'cp-load') loadSummary();
   if (e.target.id === 'sr-preview') { if (!TOKEN) return; const r = await j(API + '/customers/' + TOKEN + '/support-request-preview', Object.assign({ body: JSON.stringify({ subject: $('#sr-subject').value, body: $('#sr-body').value }) },
 JH)); $('#sr-out').textContent = 'Preview only (no ticket created): ' + JSON.stringify(r.requestPreview || r, null, 2); }
   if (e.target.id === 'msg-draft') { if (!TOKEN) return; const r = await j(API + '/customers/' + TOKEN + '/message-draft-preview', Object.assign({ body: JSON.stringify({ text: $('#msg-text').value, channel: 'whatsapp_preview' }) }, JH));
 $('#msg-out').textContent = 'Draft only (not sent): ' + esc(r.messagePreview || '') + ' → ' + esc(r.recipientMasked ||
 ''); }
 });

 (async function () { await loadStatus(); await loadCustomers(); })();
