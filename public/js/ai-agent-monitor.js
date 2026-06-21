  'use strict';
  const API = '/api/ai-agent-monitor';
  const $ = (s) => document.querySelector(s);
  async function j(u, o) { try { const r = await fetch(u, o); return await r.json(); } catch (e) { return { ok: false,

error: 'unavailable' }; } }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&', '<': '<', '>': '>' }[c])); }
const JH = { method: 'POST', headers: { 'Content-Type': 'application/json' } };


async function loadStatus() {
   const s = await j(API + '/status');
   const dry = !s || s.dryRun !== false;
   $('#am-badge').textContent = dry ? 'DRY-RUN · no live AI call · no live send' : 'CHECK CONFIG';
   $('#am-badge').className = 'am-badge ' + (dry ? 'safe' : 'warn');
}

async function loadAnalytics() {
 const r = await j(API + '/analytics');
   const cards = (r.analytics && r.analytics.cards) || [];
   $('#am-analytics').innerHTML = cards.map((c) => '<div class="am-card"><span class="am-label">' + esc(c.label) +
'</span><span class="am-value">' + esc(c.value) + (c.estimate ? ' <em>est</em>' : '') + '</span></div>').join('');
}

async function loadReplies() {
   const r = await j(API + '/replies');
   $('#reply-list').innerHTML = (r.replies || []).map((x) => '<div class="am-reply risk-' + esc(x.riskLevel) + '"><div class="am-reply-h"><strong>' + esc(x.customerNameSafe) + '</strong> <span class="muted">' + esc(x.phoneMasked) + ' · ' +
esc(x.channel) + '</span> <span class="tag risk-' + esc(x.riskLevel) + '">' + esc(x.riskLevel) + '</span> <span class="tag">' + esc(x.status) + '</span></div><div class="muted">Q: ' + esc(x.userMessagePreview) + '</div><div>A: ' +
esc(x.aiReplyPreview) + '</div><div class="am-actions"><button class="qc" data-id="' + esc(x.id) + '">Check quality</button> <button class="flag" data-id="' + esc(x.id) + '">Flag</button> <button class="ho" data-id="' + esc(x.id) + '">Handoff preview</button></div></div>').join('');
}


async function loadQueue() { const r = await j(API + '/handoff-queue'); $('#queue-list').innerHTML = (r.queue ||
[]).map((q) => '<div class="am-reply"><strong>' + esc(q.conversationId) + '</strong> <span class="tag risk-' + esc(q.riskLevel) + '">' + esc(q.riskLevel) + '</span><div class="muted">reason: ' + esc(q.reason) + ' · queue: ' +
esc(q.assignedQueue) + ' · live: ' + q.liveHandoff + '</div></div>').join('') || '<p class="muted">Queue empty.</p>'; }


async function checkQuality(id) { const r = await j(API + '/replies/' + id + '/check-quality', JH); $('#q-title').textContent = 'Quality: ' + id; $('#quality-panel').innerHTML = '<div class="am-reply"><div>confidence: <strong>'
+ r.confidenceScore + '</strong></div><div>quality: <strong>' + r.qualityScore + '</strong></div><div>risk: <span class="tag risk-' + esc(r.riskLevel) + '">' + esc(r.riskLevel) + '</span></div><div>handoff required: <strong>' +
r.handoffRequired + '</strong></div><div class="muted">' + (r.warnings || []).map(esc).join(', ') + '</div></div>';
showTab('quality'); }


function showTab(tab) { document.querySelectorAll('.am-tabs button').forEach((b) => b.classList.toggle('active',
b.dataset.tab === tab)); document.querySelectorAll('.am-tab').forEach((s) => (s.hidden = true)); $('#tab-' + tab).hidden
= false; }

document.addEventListener('click', async (e) => {
 if (e.target.matches('.am-tabs button')) { showTab(e.target.dataset.tab); if (e.target.dataset.tab === 'queue')
loadQueue(); }
 if (e.target.matches('.qc')) checkQuality(e.target.dataset.id);
 if (e.target.matches('.flag')) { await j(API + '/replies/' + e.target.dataset.id + '/flag', Object.assign({ body:
JSON.stringify({ reason: 'manual' }) }, JH)); loadReplies(); }
 if (e.target.matches('.ho')) { await j(API + '/replies/' + e.target.dataset.id + '/handoff-preview', JH);
loadReplies(); loadQueue(); }
 if (e.target.id === 'rule-run') { const r = await j(API + '/handoff-rules/check', Object.assign({ body:
JSON.stringify({ userMessage: $('#rule-msg').value, aiReply: $('#rule-reply').value, confidenceScore:
parseFloat($('#rule-conf').value) }) }, JH)); $('#rule-result').textContent = JSON.stringify(r, null, 2); }
 if (e.target.id === 'gap-run') { const r = await j(API + '/knowledge-gap/check', Object.assign({ body: JSON.stringify({

  userMessage: $('#gap-msg').value }) }, JH)); $('#gap-result').textContent = JSON.stringify(r, null, 2); }
    if (e.target.id === 'ov-run') { const r = await j(API + '/override-draft', Object.assign({ body: JSON.stringify({
  overrideText: $('#ov-text').value }) }, JH)); $('#ov-result').textContent = JSON.stringify(r, null, 2); }
  });


  (async function () { await loadStatus(); await loadAnalytics(); await loadReplies(); })();
