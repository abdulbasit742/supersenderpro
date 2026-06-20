const $ = (s) => document.querySelector(s);
const api = (p, opts) => fetch(p, opts).then(r => r.json());

async function loadStatus() {
  const s = await api('/api/agent-runtime/status');
  $('#policy').textContent = `mode: ${s.mode} · dry-run default: ${s.policy.dryRunDefault} · live actions: ${s.policy.liveActionsEnabled}`;
  $('#agent').innerHTML = s.agents.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
  $('#toolCount').textContent = `(${s.tools.length})`;
  $('#tools').innerHTML = s.tools.map(t =>
    `<div class="tool"><div><b>${t.name}</b> <span class="r risk-${t.risk}">[${t.risk}]</span></div><div class="muted">${t.description}</div></div>`).join('');
}

function badge(status){ return `<span class="badge b-${status}">${status.replace('_',' ')}</span>`; }

async function run(dryRunOverride) {
  const goal = $('#goal').value.trim();
  if (!goal) return;
  const agent = $('#agent').value;
  const dryRun = dryRunOverride !== undefined ? dryRunOverride : $('#dryRun').checked;
  $('#transcript').innerHTML = '<div class="empty">running…</div>';
  const res = await api('/api/agent-runtime/run', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ goal, agent, dryRun })
  });
  const rows = (res.transcript || []).map((t, i) =>
    `<div class="step">${badge(t.status)} <b>${t.tool}</b> <span class="muted">${t.rationale || ''}</span></div>`).join('');
  $('#transcript').innerHTML = rows || '<div class="empty">no steps</div>';
  loadQueue();
}

async function plan() {
  const goal = $('#goal').value.trim(); if (!goal) return;
  const res = await api('/api/agent-runtime/plan', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ goal, agent: $('#agent').value })
  });
  $('#transcript').innerHTML = (res.steps || []).map(s =>
    `<div class="step">${badge(s.evaluation.decision)} <b>${s.tool}</b> <span class="muted">${s.rationale || ''}</span></div>`).join('');
}

async function loadQueue() {
  const q = await api('/api/agent-runtime/queue');
  $('#queueStats').innerHTML = Object.entries(q.stats)
    .map(([k, v]) => `<span>${k}: <b>${v}</b></span>`).join('');
  const items = (q.tasks || []).filter(t => t.status === 'pending_approval');
  if (!items.length) { $('#queue').innerHTML = '<div class="empty">No drafts awaiting approval.</div>'; return; }
  $('#queue').innerHTML = items.map(t => `
    <div class="qitem" data-id="${t.id}">
      <div class="head">
        <div>${badge(t.status)} <b>${t.action?.tool}</b> <span class="muted">${t.agent}</span></div>
        <div class="acts">
          <button class="primary sm" data-act="approve">Approve & run</button>
          <button class="ghost sm" data-act="reject">Reject</button>
        </div>
      </div>
      <div class="mono muted" style="margin-top:6px">${JSON.stringify(t.action?.args || {})}</div>
    </div>`).join('');
}

document.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-act]'); if (!btn) return;
  const id = btn.closest('.qitem').dataset.id;
  const act = btn.dataset.act;
  btn.disabled = true;
  await api(`/api/agent-runtime/queue/${id}/${act}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}'
  });
  loadQueue();
});

$('#runBtn').onclick = () => run();
$('#planBtn').onclick = () => plan();
$('#refreshQ').onclick = () => loadQueue();
loadStatus(); loadQueue();
