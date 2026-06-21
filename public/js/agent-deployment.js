  'use strict';
  const API = '/api/agent-deployment';
  const $ = (s) => document.querySelector(s);
  const j = (u, o) => fetch(u, o).then((r) => r.json());


  async function loadStatus() {
    const s = await j(API + '/status');
      $('#ov-agents').textContent = s.counts.agents;
      $('#ov-deploys').textContent = s.counts.activeDeployments;
      $('#ov-approval').textContent = s.counts.approvalPending;
      $('#ov-blocks').textContent = (s.audit && s.audit.blocked) || 0;
      $('#ov-dry').textContent = s.dryRun ? 'ON' : 'off';
      $('#ov-live-off').textContent = s.liveActionsDisabled;
      $('#ad-mode').textContent = s.dryRun ? 'DRY-RUN · approval required' : 'LIVE GATES OPEN';
      $('#ad-mode').className = 'ad-badge ' + (s.dryRun ? 'safe' : 'warn');
      window.__targets = s.targets.map((t) => t.type);
  }

  async function loadAgents() {
      const { agents } = await j(API + '/agents');
      const tb = $('#agents-table tbody'); tb.innerHTML = '';
      for (const a of agents) {
        const tr = document.createElement('tr');
      tr.innerHTML = `<td>${a.name}</td><td>${a.type}</td><td>${a.dryRun ? 'dry-run' : 'live'}</td><td>${(a.allowedTargets||[]).length}</td><td>${a.approvalRequired ? 'yes' : 'no'}</td><td><button data-id="${a.id}" class="toggle">${a.enabled ? 'Disable' : 'Enable'}</button></td>`;
      tb.appendChild(tr);
      }
      fillAgentSelects(agents);
  }

  function fillAgentSelects(agents) {

   for (const id of ['#f-agent', '#t-agent']) {
    const sel = $(id); if (!sel) continue; sel.innerHTML = '';
    agents.forEach((a) => { const o = document.createElement('option'); o.value = a.id; o.textContent = a.name;
sel.appendChild(o); });
 }
}


function fillTargetSelects() {
 const targets = window.__targets || [];
   for (const id of ['#f-target', '#t-target']) {
     const sel = $(id); if (!sel) continue; sel.innerHTML = '';
   targets.forEach((t) => { const o = document.createElement('option'); o.value = t; o.textContent = t;
sel.appendChild(o); });
   }
   const modes = ['suggest_only','draft_only','approval_required','supervised_live','disabled'];
 const ms = $('#f-mode'); if (ms) { ms.innerHTML=''; modes.forEach((m)=>{const
o=document.createElement('option');o.value=m;o.textContent=m;ms.appendChild(o);}); }
 const actions =
['suggest_reply','create_whatsapp_message_draft','create_channel_post_draft','create_social_post_draft','create_voice_rep ly_draft','create_followup_task_draft','notify_admin_draft','summarize_conversation','classify_message','detect_intent',' generate_caption'];
 const as = $('#t-action'); if (as) { as.innerHTML=''; actions.forEach((a)=>{const
o=document.createElement('option');o.value=a;o.textContent=a;as.appendChild(o);}); }
}


async function loadMatrix() {
 const [{ agents }, { deployments }] = await Promise.all([j(API+'/agents'), j(API+'/deployments')]);
   const cols = window.__targets || [];
   let html = '<table class="matrix"><thead><tr><th>Agent</th>' + cols.map((c)=>`<th>${c}</th>`).join('') + '</tr></thead><tbody>';
 for (const a of agents) {
    html += `<tr><td>${a.name}</td>` + cols.map((c) => {
      const d = deployments.find((x)=>x.agentId===a.id && x.targetType===c);
     const badge = d ? (d.enabled ? '<span class="b on">on</span>' : '<span class="b">off</span>') : '<span class="b dim">–</span>';
      return `<td>${badge}</td>`;
    }).join('') + '</tr>';
   }
   html += '</tbody></table>';
   $('#matrix').innerHTML = html;
}


async function loadFlow() {
   const f = await j(API + '/flow-nodes');
   $('#flow-triggers').innerHTML = f.triggers.map((t)=>`<li><code>${t.id}</code> ${t.label}</li>`).join('');
   $('#flow-actions').innerHTML = f.actions.map((a)=>`<li><code>${a.id}</code> ${a.label}</li>`).join('');
}
async function loadAudit() {
 const { audit } = await j(API + '/audit?limit=100');
   $('#audit-log').textContent = JSON.stringify(audit, null, 2);
}


// events
document.addEventListener('click', async (e) => {
 if (e.target.matches('.ad-tabs button')) {
    document.querySelectorAll('.ad-tabs button').forEach((b)=>b.classList.remove('active'));
    e.target.classList.add('active');

        const tab = e.target.dataset.tab;
        document.querySelectorAll('.ad-tab').forEach((s)=>s.hidden = true);
        $('#tab-'+tab).hidden = false;
        if (tab==='matrix') loadMatrix(); if (tab==='flow') loadFlow(); if (tab==='safety') loadAudit();
    }
    if (e.target.matches('.toggle')) {
      const id = e.target.dataset.id; const dep = null; // toggling agents is via PUT
      await j(API + '/agents/' + id, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({
  enabled: e.target.textContent==='Enable' }) });
        loadAgents();
    }
  });

  $('#editor-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = { agentId: $('#f-agent').value, targetType: $('#f-target').value, mode: $('#f-mode').value,
  scheduleWindow: $('#f-window').value || null, rateLimit: Number($('#f-rate').value)||null, approvalRequired: $('#f-approval').checked };
    const r = await j(API+'/deployments', { method:'POST', headers:{'Content-Type':'application/json'}, body:
  JSON.stringify(body) });
    $('#editor-result').textContent = JSON.stringify(r, null, 2);
    loadStatus();
  });

  $('#tester-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = { agentId: $('#t-agent').value, targetType: $('#t-target').value, actionType: $('#t-action').value, input:
  { text: $('#t-input').value } };
    const r = await j(API+'/actions/draft', { method:'POST', headers:{'Content-Type':'application/json'}, body:
  JSON.stringify(body) });
    $('#tester-result').textContent = JSON.stringify(r, null, 2);
  });


  (async function init() {
    await loadStatus();
    fillTargetSelects();
    await loadAgents();
  })();
