  'use strict';
  const API = '/api/marketing-journeys';

const $ = (s) => document.querySelector(s);
async function j(u, o) { try { const r = await fetch(u, o); return await r.json(); } catch (e) { return { ok: false,
error: 'unavailable' }; } }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&', '<': '<', '>': '>' }[c])); }

async function loadStatus() {
 const s = await j(API + '/status');
   const dry = !s || s.dryRun !== false;
   $('#mj-badge').textContent = dry ? 'DRY-RUN · no live email/SMS · no external calls' : 'CHECK CONFIG';
   $('#mj-badge').className = 'mj-badge ' + (dry ? 'safe' : 'warn');
}

async function loadAnalytics() {
   const r = await j(API + '/analytics');
   const cards = (r.analytics && r.analytics.cards) || [];
 $('#mj-analytics').innerHTML = cards.map((c) => '<div class="mj-card"><span class="mj-label">' + esc(c.label) +
'</span><span class="mj-value">' + esc(c.value) + (c.estimate ? ' <em>est</em>' : '') + '</span></div>').join('');
}


async function loadJourneys() {
 const r = await j(API + '/journeys');
 $('#journey-list').innerHTML = (r.journeys || []).map((x) => '<div class="mj-tile"><h3>' + esc(x.name) + '</h3><p class="muted">' + esc(x.status) + ' · ' + (x.channelMix || []).join('/') + ' · ' + x.steps + ' steps</p><button class="run" data-id="' + esc(x.id) + '">Dry-run</button> <button class="edit" data-id="' + esc(x.id) + '">View</button></div>').join('');
}


async function loadSelectors() {
 const seg = await j(API + '/segments'); $('#seg-select').innerHTML = (seg.segments || []).map((s) => '<option value="' + esc(s.id) + '">' + esc(s.name) + ' (~' + s.estimate + ')</option>').join('');
 const em = await j(API + '/templates/email'); $('#em-select').innerHTML = (em.templates || []).map((t) => '<option value="' + esc(t.id) + '">' + esc(t.id) + '</option>').join('');
 const sm = await j(API + '/templates/sms'); $('#sm-select').innerHTML = (sm.templates || []).map((t) => '<option value="' + esc(t.id) + '">' + esc(t.id) + '</option>').join('');
}

async function runPreview(id) {
 const r = await j(API + '/journeys/' + id + '/preview-run', { method: 'POST', headers: { 'Content-Type':
'application/json' }, body: '{}' });
 $('#pv-title').textContent = 'Dry-run: ' + id + ' (' + (r.emailDrafts || []).length + ' email, ' + (r.smsDrafts ||
[]).length + ' SMS drafts)';
 const emailHtml = (r.emailDrafts || []).map((d) => '<div class="mj-draft"><span class="tag">email</span> <strong>' +
esc(d.subjectPreview) + '</strong><div class="muted">to ' + esc(d.recipientMasked) + ' · consent ' + d.consentOk + ' · unsub ' + d.unsubscribeIncluded + '</div><pre>' + esc(d.bodyPreview) + '</pre></div>');
 const smsHtml = (r.smsDrafts || []).map((d) => '<div class="mj-draft"><span class="tag">sms</span> <div class="muted">to ' + esc(d.recipientMasked) + ' · consent ' + d.consentOk + ' · opt-out ' + d.optOutIncluded + '</div><pre>' + esc(d.messagePreview) + '</pre></div>');
   $('#preview').innerHTML = emailHtml.concat(smsHtml).join('') || '<p class="muted">No drafts in this journey.</p>';
   showTab('preview');
}


async function viewJourney(id) { const r = await j(API + '/journeys/' + id); $('#ed-title').textContent = (r.journey &&
r.journey.name) || id; $('#editor').textContent = JSON.stringify(r.journey || {}, null, 2); showTab('editor'); }


function showTab(tab) { document.querySelectorAll('.mj-tabs button').forEach((b) => b.classList.toggle('active',
b.dataset.tab === tab)); document.querySelectorAll('.mj-tab').forEach((s) => (s.hidden = true)); $('#tab-' + tab).hidden
= false; }

  document.addEventListener('click', async (e) => {
    if (e.target.matches('.mj-tabs button')) showTab(e.target.dataset.tab);
    if (e.target.matches('.run')) runPreview(e.target.dataset.id);
    if (e.target.matches('.edit')) viewJourney(e.target.dataset.id);
    if (e.target.id === 'seg-load') { const r = await j(API + '/segments/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ segmentId: $('#seg-select').value }) }); $('#segment').innerHTML =
  '<div class="muted">~' + r.preview.estimate + ' recipients · sample masked</div>' + r.preview.sample.map((s) => '<div class="mj-row"><code>' + esc(s.recipientEmailMasked) + '</code> · <code>' + esc(s.recipientPhoneMasked) + '</code> · email ' + s.consentEmail + ' · sms ' + s.consentSms + '</div>').join(''); }
    if (e.target.id === 'em-load') { const r = await j(API + '/templates/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channel: 'email', templateId: $('#em-select').value }) }); $('#email-preview').innerHTML = '<div class="mj-draft"><strong>' + esc(r.subjectPreview) + '</strong><div class="muted">to ' +
  esc(r.recipientMasked) + ' · unsub ' + r.unsubscribeIncluded + '</div><pre>' + esc(r.bodyPreview) + '</pre></div>'; }
    if (e.target.id === 'sm-load') { const r = await j(API + '/templates/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ channel: 'sms', templateId: $('#sm-select').value }) }); $('#sms-preview').innerHTML = '<div class="mj-draft"><div class="muted">to ' + esc(r.recipientMasked) + ' · opt-out ' +
  r.optOutIncluded + '</div><pre>' + esc(r.messagePreview) + '</pre></div>'; }
  });

  (async function () { await loadStatus(); await loadAnalytics(); await loadJourneys(); await loadSelectors(); })();
