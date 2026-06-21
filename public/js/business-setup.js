  'use strict';
  const API = '/api/business-setup';
  const $ = (s) => document.querySelector(s);
  const j = (u, o) => fetch(u, o).then((r) => r.json());

  async function loadStatus() {
      const s = await j(API + '/status');
      $('#bs-dry').textContent = s.dryRun ? 'DRY-RUN · approval required' : 'LIVE ENABLE OPEN';
      $('#bs-dry').className = 'bs-badge ' + (s.dryRun ? 'safe' : 'warn');
      $('#ov-name').textContent = (s.hasProfile && s.businessType) ? s.businessType : '–';
      $('#ov-type').textContent = s.businessType || '–';
      $('#ov-preset').textContent = s.selectedPreset || '–';
      $('#ov-score').textContent = s.readiness ? (s.readiness.score + ' (' + s.readiness.band + ')') : '–';
      const sel = $('#p-type'); sel.innerHTML = '';
    (s.businessTypes || []).forEach((t) => { const o = document.createElement('option'); o.value = t; o.textContent = t;
  sel.appendChild(o); });
  }


  async function loadPresets() {
    const { presets } = await j(API + '/presets');
      $('#preset-cards').innerHTML = presets.map((p) => `<div class="bs-preset"><h3>${p.label}</h3><p>${(p.recommendedModules || []).slice(0,5).join(', ')}</p><button class="apply" data-id="${p.id}">Apply (dry-run)</button></div>`).join('');
  }


  async function loadChecklist() {
    const { checklist } = await j(API + '/checklist');
      if (!checklist.length) { $('#checklist-list').innerHTML = '<p>No checklist yet. Apply a preset first.</p>'; return; }
      $('#checklist-list').innerHTML = checklist.map((i) => `<div class="bs-chk ${i.status}"><div><strong>${i.title}</strong> ${i.required ? '<span class="req">required</span>' : ''} ${i.blocker ? '<span class="blk">blocker</span>' : ''}</div><div class="muted">${i.description}</div><div class="row"><span class="status">${i.status}</span><select data-id="${i.id}" class="mark"><option value="not_started">not_started</option><option value="configured">configured</option><option value="verified">verified</option><option value="warning">warning</option><option value="blocked">blocked</option><option value="skipped">skipped</option></select></div></div>`).join('');
}


async function runReadiness() {
   const { readiness } = await j(API + '/readiness/run', { method: 'POST' });
   $('#doctor-result').innerHTML = `<div class="score band-${readiness.band}">${readiness.score} <small>${readiness.band}</small></div><h4>Blockers</h4><ul>${readiness.blockers.map((b)=>`<li>${b.title}</li>`).join('') || '<li>none</li>'}</ul><h4>Warnings</h4><ul>${readiness.warnings.map((w)=>`<li>${w}</li>`).join('') || '<li>none</li>'}</ul>`;
   loadStatus();
}

document.addEventListener('click', async (e) => {
 if (e.target.matches('.bs-tabs button')) {
       document.querySelectorAll('.bs-tabs button').forEach((b)=>b.classList.remove('active'));
       e.target.classList.add('active');
       const tab = e.target.dataset.tab;
       document.querySelectorAll('.bs-tab').forEach((s)=>s.hidden = true);
       $('#tab-'+tab).hidden = false;
       if (tab==='presets') loadPresets(); if (tab==='checklist') loadChecklist();
   }
   if (e.target.matches('.apply')) {
       const presetId = e.target.dataset.id;
       const r = await j(API + '/apply-preset', { method:'POST', headers:{'Content-Type':'application/json'}, body:
JSON.stringify({ presetId }) });
   $('#preset-result').textContent = JSON.stringify(r.result, null, 2);
       loadStatus();
   }
   if (e.target.id === 'run-readiness') runReadiness();
   if (e.target.id === 'do-export') {
       const r = await j(API + '/export', { method:'POST' });
       $('#export-result').textContent = JSON.stringify(r.export, null, 2);
 }
});

document.addEventListener('change', async (e) => {
   if (e.target.matches('.mark')) {
     await j(API + '/checklist/' + e.target.dataset.id + '/mark', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status: e.target.value }) });
   loadChecklist(); loadStatus();
 }
});


$('#profile-form').addEventListener('submit', async (e) => {
   e.preventDefault();
   const body = { businessName: $('#p-name').value, businessType: $('#p-type').value, country: $('#p-country').value,
language: $('#p-lang').value, currency: $('#p-currency').value };
 const r = await j(API + '/profile', { method:'POST', headers:{'Content-Type':'application/json'}, body:
JSON.stringify(body) });
 $('#profile-result').textContent = JSON.stringify(r, null, 2);
 loadStatus();
});

loadStatus();
