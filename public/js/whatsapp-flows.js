 'use strict';
 const API = '/api/whatsapp-flows';
 const $ = (s) => document.querySelector(s);
 async function j(u, o) { try { const r = await fetch(u, o); return await r.json(); } catch (e) { return { ok: false,
 error: 'unavailable' }; } }
 function esc(s) { return String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&', '<': '<', '>': '>' }[c])); }
 const JH = { method: 'POST', headers: { 'Content-Type': 'application/json' } };
 let CURRENT = { flow: null, screenId: null };

async function loadStatus() { const s = await j(API + '/status'); const dry = !s || s.dryRun !== false; $('#wf-badge').textContent = dry ? 'DRY-RUN · no live send · no Meta publish · PII masked' : 'CHECK CONFIG'; $('#wf-badge').className = 'wf-badge ' + (dry ? 'safe' : 'warn'); }

async function loadKpis() { const s = await j(API + '/summary'); const cards = [['Flows', s.totalFlows], ['Responses',
s.totalResponsesPreview]].concat(Object.entries(s.byCategory || {}).map(([k, v]) => [k, v])); $('#wf-kpis').innerHTML =
cards.map(([l, v]) => '<div class="wf-card"><span class="wf-label">' + esc(l) + '</span><span class="wf-value">' + esc(v)
+ '</span></div>').join(''); }

async function loadFlows() {
  const r = await j(API + '/flows');
  const opts = (r.flows || []).map((f) => '<option value="' + esc(f.id) + '">' + esc(f.name) + '</option>').join('');
  $('#wf-flow-select').innerHTML = opts; $('#wf-builder-select').innerHTML = opts;
  $('#flow-list').innerHTML = (r.flows || []).map((f) => '<div class="wf-tile"><h3>' + esc(f.name) + '</h3><p class="muted">' + esc(f.category) + ' · ' + esc(f.status) + ' · ' + f.screens + ' screens</p><button class="prev" data-id="' + esc(f.id) + '">Preview</button></div>').join('');
}


async function startPreview(id) {
CURRENT.flow = await (await fetch(API + '/flows/' + id)).json().then((x) => x.flow).catch(() => null);
  if (!CURRENT.flow) return;
  CURRENT.screenId = CURRENT.flow.firstScreenId;
  renderScreen();
  showTab('preview');
}


function renderScreen() {
const flow = CURRENT.flow; if (!flow) return;
  const screen = (flow.screens || []).find((s) => s.id === CURRENT.screenId);
  $('#wf-phone-title').textContent = flow.name + ' · ' + (screen ? screen.title : '');
if (!screen) { $('#wf-screen').innerHTML = '<div class="wf-done">✓ Flow complete (preview)</div>'; $('#wf-next').hidden = true; return; }
  $('#wf-screen').innerHTML = (screen.layout || []).map((c) => renderComponent(c)).join('');
  $('#wf-next').hidden = false;
  $('#wf-next').textContent = (screen.layout.find((c) => c.type === 'Footer') || {}).text || 'Continue';
}


function renderComponent(c) {
  if (c.type === 'TextHeading') return '<div class="c-head">' + esc(c.text) + '</div>';
  if (c.type === 'TextBody' || c.type === 'TextCaption') return '<div class="c-body">' + esc(c.text) + '</div>';
  if (c.type === 'Footer') return '';
  const label = '<label class="c-label">' + esc(c.label || c.name) + (c.required ? ' *' : '') + '</label>';
if (c.type === 'TextInput') return label + '<input data-name="' + esc(c.name) + '" type="' + (c.inputType === 'number' ? 'number' : 'text') + '" class="c-input" />';
  if (c.type === 'TextArea') return label + '<textarea data-name="' + esc(c.name) + '" class="c-input"></textarea>';
  if (c.type === 'DatePicker') return label + '<input data-name="' + esc(c.name) + '" type="date" class="c-input" />';
if (c.type === 'OptIn') return '<label class="c-optin"><input data-name="' + esc(c.name) + '" type="checkbox" /> ' +
esc(c.label) + '</label>';
if (c.type === 'Dropdown' || c.type === 'RadioButtonsGroup' || c.type === 'CheckboxGroup') return label + '<select data-name="' + esc(c.name) + '" class="c-input">' + (c.options || []).map((o) => '<option value="' + esc(o.id || o) +'">' + esc(o.title || o.id || o) + '</option>').join('') + '</select>';
return '';
}


function collectAnswers() {
const answers = {};

     document.querySelectorAll('#wf-screen [data-name]').forEach((el) => { answers[el.dataset.name] = el.type === 'checkbox'
 ? el.checked : el.value; });
   return answers;
 }


 async function advance() {
   const answers = collectAnswers();
     const screen = (CURRENT.flow.screens || []).find((s) => s.id === CURRENT.screenId);
     const terminal = screen && (screen.terminal || !screen.nextScreenId);
     const endpoint = terminal ? '/submit-preview' : '/run-preview';
     const r = await j(API + '/flows/' + CURRENT.flow.id + endpoint, Object.assign({ body: JSON.stringify({ screenId:
 CURRENT.screenId, answers }) }, JH));
   $('#wf-state').textContent = JSON.stringify(r, null, 2);
     if (r.validationErrors && r.validationErrors.length) return; // stay on screen
     if (terminal) { CURRENT.screenId = null; renderScreen(); }
     else { CURRENT.screenId = r.nextScreenId; renderScreen(); }
 }


 function showTab(tab) { document.querySelectorAll('.wf-tabs button').forEach((b) => b.classList.toggle('active',
 b.dataset.tab === tab)); document.querySelectorAll('.wf-tab').forEach((s) => (s.hidden = true)); $('#tab-' + tab).hidden
 = false; if (tab === 'responses') loadResponses(); if (tab === 'analytics') loadAnalytics(); }
 async function loadResponses() { const r = await j(API + '/responses'); $('#resp-list').innerHTML = (r.responses ||
 []).map((x) => '<div class="line"><strong>' + esc(x.flowId) + '</strong> <span class="muted">' + esc(x.capturedAt) +
 '</span><pre>' + esc(JSON.stringify(x.answersMasked)) + '</pre></div>').join('') || '<p class="muted">No responses yet. Complete a preview flow.</p>'; }
 async function loadAnalytics() { $('#analytics-result').textContent = JSON.stringify(await j(API + '/analytics'), null,
 2); }


 document.addEventListener('click', async (e) => {
     if (e.target.closest('.wf-tabs button')) showTab(e.target.closest('button').dataset.tab);
     if (e.target.matches('.prev')) startPreview(e.target.dataset.id);
     if (e.target.id === 'wf-start') startPreview($('#wf-flow-select').value);
     if (e.target.id === 'wf-next') advance();
   if (e.target.id === 'wf-validate') { const r = await j(API + '/flows/' + $('#wf-builder-select').value + '/validate',
 JH); const f = await j(API + '/flows/' + $('#wf-builder-select').value); $('#wf-builder').textContent = JSON.stringify({
 validation: r, flow: f.flow }, null, 2); }
 });


 (async function () { await loadStatus(); await loadKpis(); await loadFlows(); })();
