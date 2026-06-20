// public/js/whatsapp-cloud-setup.js — Dashboard client. Read/preview only; never triggers a live send or live API call.
const API = '/api/whatsapp-cloud-setup';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

async function api(path, method = 'GET', body) {
  const opt = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opt.body = JSON.stringify(body);
  const r = await fetch(API + path, opt);
  return r.json();
}
const pill = (text, cls = '') => `<span class="pill ${cls}">${text}</span>`;
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

// Tabs
$$('.wcs-tab').forEach((t) => t.addEventListener('click', () => {
  $$('.wcs-tab').forEach((x) => x.classList.remove('active'));
  t.classList.add('active');
  $$('.wcs-panel').forEach((p) => p.classList.remove('active'));
  $('#' + t.dataset.tab).classList.add('active');
}));

function renderBadges(safety) {
  const items = [
    ['Dry-run', safety.dryRunEnabled, true],
    ['Live send OFF', safety.liveSendDisabled, true],
    ['Sync live OFF', safety.templateSyncLiveDisabled, true],
    ['Token hidden', safety.tokenHidden, true],
    ['PII redacted', safety.piiRedacted, true],
  ];
  $('#wcs-safety-badges').innerHTML = items.map(([k, ok]) => `<span class="wcs-badge ${ok ? 'ok' : 'bad'}">${ok ? '✓' : '✗'} ${k}</span>`).join('');
  $('#wcs-safety-cards').innerHTML = Object.entries(safety).map(([k, v]) =>
    `<div class="wcs-card"><div class="k">${esc(k)}</div><div class="v">${v ? 'YES' : 'NO'}</div></div>`).join('');
}

async function loadReadiness() {
  const { readiness } = await api('/readiness');
  if (!readiness) return;
  $('#wcs-score').textContent = readiness.score;
  $('#wcs-status').textContent = readiness.status.replace(/_/g, ' ');
  const c = readiness.counts || {};
  $('#wcs-readiness-cards').innerHTML = [
    ['Checklist', `${c.checklistDone}/${c.checklistTotal}`],
    ['Templates', c.templates], ['Approved', c.approvedTemplates],
  ].map(([k, v]) => `<div class="wcs-card"><div class="k">${k}</div><div class="v">${v ?? '-'}</div></div>`).join('');
  $('#wcs-blockers').innerHTML = (readiness.blockers || []).map((b) => `<li>${esc(b)}</li>`).join('') || '<li class="wcs-muted">none</li>';
  $('#wcs-warnings').innerHTML = (readiness.warnings || []).map((w) => `<li>${esc(w)}</li>`).join('') || '<li class="wcs-muted">none</li>';
  $('#wcs-nextsteps').innerHTML = (readiness.nextSteps || []).map((n) => `<li>${esc(n)}</li>`).join('');
}

async function loadChecklist() {
  const { checklist } = await api('/checklist');
  $('#wcs-checklist').innerHTML = (checklist || []).map((i) =>
    `<label class="wcs-check"><input type="checkbox" data-key="${i.key}" ${i.done ? 'checked' : ''}/> ${esc(i.label)} <span class="grp">${i.group}</span></label>`).join('');
  $$('#wcs-checklist input').forEach((cb) => cb.addEventListener('change', async () => {
    await api('/checklist/update', 'POST', { key: cb.dataset.key, done: cb.checked });
    loadReadiness();
  }));
}

async function loadWebhook() {
  const info = await api('/webhook-info');
  $('#wcs-webhook-info').innerHTML = `
    <div class="wcs-card"><div class="k">Expected webhook URL</div><div class="v" style="font-size:14px">${esc(info.expectedWebhookUrl)}</div></div>
    <p class="wcs-muted">Verify token env var: <code>${esc(info.verifyTokenEnvVar)}</code> — configured: ${info.verifyTokenConfigured ? '✓' : '✗'}</p>
    <ol class="wcs-list">${(info.flow || []).map((f) => `<li>${esc(f)}</li>`).join('')}</ol>`;
}

async function loadTemplates() {
  const { templates } = await api('/templates');
  const tbody = $('#wcs-templates tbody');
  tbody.innerHTML = (templates || []).map((t) =>
    `<tr><td>${esc(t.name)}</td><td>${esc(t.category)}</td><td>${pill(t.status, t.status)}</td>
     <td>${pill(t.qualityRating || 'unknown', t.qualityRating)}</td><td>${(t.variables || []).length}</td>
     <td><button class="linkbtn" data-act="preview" data-id="${t.id}">preview</button>
         <button class="linkbtn" data-act="validate" data-id="${t.id}">validate</button>
         <button class="linkbtn" data-act="copyid" data-id="${t.id}">id</button></td></tr>`).join('');
  $$('#wcs-templates .linkbtn').forEach((b) => b.addEventListener('click', async () => {
    const id = b.dataset.id;
    if (b.dataset.act === 'preview') show('#wcs-template-result', await api(`/templates/${id}/preview`, 'POST', { values: {} }));
    else if (b.dataset.act === 'validate') show('#wcs-template-result', await api(`/templates/${id}/validate`, 'POST', {}));
    else { $('#send-templateId').value = id; show('#wcs-template-result', { templateId: id }); }
  }));
}

function show(sel, obj) { $(sel).textContent = JSON.stringify(obj, null, 2); }

// Forms
$('#wcs-config-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = {
    businessName: $('#cfg-businessName').value, wabaId: $('#cfg-wabaId').value,
    phoneNumberId: $('#cfg-phoneNumberId').value, appId: $('#cfg-appId').value,
    webhookUrl: $('#cfg-webhookUrl').value,
  };
  show('#wcs-config-result', await api('/validate-config', 'POST', body));
  loadReadiness();
});
$('#wcs-webhook-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  show('#wcs-webhook-result', await api('/webhook-test-preview', 'POST', {
    'hub.mode': 'subscribe', 'hub.verify_token': $('#wh-token').value, 'hub.challenge': $('#wh-challenge').value,
  }));
});
$('#wcs-template-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = {
    name: $('#tpl-name').value, language: $('#tpl-language').value, category: $('#tpl-category').value,
    body: $('#tpl-body').value, footer: $('#tpl-footer').value,
  };
  show('#wcs-template-result', await api('/templates', 'POST', body));
  loadTemplates();
});
$('#wcs-send-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  show('#wcs-send-result', await api('/send-preview', 'POST', {
    templateId: $('#send-templateId').value, recipient: $('#send-recipient').value,
  }));
});
$('#wcs-sync-preview').addEventListener('click', async () => show('#wcs-template-result', await api('/templates/sync-preview', 'POST', {})));
$('#wcs-template-report').addEventListener('click', async () => show('#wcs-template-result', await api('/templates/report')));

(async function init() {
  const status = await api('/status');
  if (status && status.safety) renderBadges(status.safety);
  await Promise.all([loadReadiness(), loadChecklist(), loadWebhook(), loadTemplates()]);
})();
