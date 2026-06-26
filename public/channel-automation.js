/* Channel Automation Command Center — dashboard client (Module 6). */
const API = '/api/channels';
const ADMIN_SECRET = localStorage.getItem('channelAdminSecret') || '';

function headers() {
  const h = { 'Content-Type': 'application/json' };
  if (ADMIN_SECRET) h['x-admin-secret'] = ADMIN_SECRET;
  return h;
}
async function getJSON(url) { const r = await fetch(url, { headers: headers() }); return r.json(); }
async function postJSON(url, body) { const r = await fetch(url, { method: 'POST', headers: headers(), body: JSON.stringify(body || {}) }); return r.json(); }

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}
function esc(s) { return String(s == null ? '' : s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }

async function loadStatus() {
  const d = await getJSON(`${API}/status`);
  const s = d.status || {};
  const modeEl = document.getElementById('mode');
  modeEl.textContent = s.mode === 'LIVE' ? 'LIVE' : 'DRY-RUN';
  modeEl.className = 'mode ' + (s.mode === 'LIVE' ? 'live' : 'dry');
  document.getElementById('paused').textContent = s.paused ? '⏸ PAUSED' : '';
  const cards = [
    ['Sources Active', `${s.sourcesActive || 0}/${s.sourcesTotal || 0}`],
    ['Target Channels', s.targets || 0],
    ['Queue Pending', s.queuePending || 0],
    ['Approval Pending', s.approvalPending || 0],
    ['Forwarded Today', s.forwardedToday || 0],
    ['Failed Today', s.failedToday || 0]
  ];
  document.getElementById('cards').innerHTML = cards.map(c =>
    `<div class="card"><div class="num">${c[1]}</div><div class="lbl">${c[0]}</div></div>`).join('');
}

async function loadSources() {
  const d = await getJSON(`${API}/sources`);
  const targets = (await getJSON(`${API}/targets`)).targets || [];
  const tOpts = id => targets.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('');
  document.getElementById('srcBody').innerHTML = (d.sources || []).map(s => `
    <tr>
      <td>${esc(s.name)}<div class="small">${esc(s.id)}</div></td>
      <td>${esc(s.category)}<div class="small">${esc(s.sourceType || 'whatsapp_channel')}</div></td>
      <td><span class="pill ${s.health?.status || 'dead'}">${esc(s.health?.status || 'unknown')}</span></td>
      <td class="small">${s.health?.lastPostAt ? new Date(s.health.lastPostAt).toLocaleString() : '—'}</td>
      <td>${s.priority}</td>
      <td>${(s.rules?.targets || []).length}</td>
      <td><select onchange="routeTo('${s.id}', this.value)"><option value="">+ route…</option>${tOpts(s.id)}</select></td>
    </tr>`).join('') || '<tr><td colspan="7" class="small">No sources yet.</td></tr>';
}

async function loadTargets() {
  const d = await getJSON(`${API}/targets`);
  document.getElementById('tgtBody').innerHTML = (d.targets || []).map(t => `
    <tr>
      <td>${esc(t.name)}</td>
      <td class="small">${esc(t.channelId) || '—'}</td>
      <td>${esc(t.platform)}</td>
      <td class="small">${esc(t.branding) || '—'}</td>
      <td><button class="btn danger" onclick="delTarget('${t.id}')">Delete</button></td>
    </tr>`).join('') || '<tr><td colspan="5" class="small">No targets yet.</td></tr>';
}

async function loadQueue() {
  const d = await getJSON(`${API}/queue`);
  const rows = (d.queue || []).slice().reverse().slice(0, 40);
  document.getElementById('queueBody').innerHTML = rows.map(q => `
    <tr>
      <td>${esc(q.sourceName)} → ${esc(q.targetName)}<div class="small">${esc(q.platform)}</div></td>
      <td class="small">${esc((q.content?.text || '').slice(0, 90))}</td>
      <td><span class="pill ${q.status}">${esc(q.status)}</span></td>
      <td><div class="row-actions">
        ${q.status === 'pending_approval' ? `<button class="btn" onclick="qAct('${q.id}','approve')">Approve</button>` : ''}
        ${q.status !== 'rejected' && q.status !== 'published' ? `<button class="btn danger" onclick="qAct('${q.id}','reject')">Reject</button>` : ''}
        ${q.status === 'approved' ? `<button class="btn warn" onclick="qPublish('${q.id}')">Publish now</button>` : ''}
      </div></td>
    </tr>`).join('') || '<tr><td colspan="4" class="small">Queue empty.</td></tr>';
}

async function loadLogs() {
  const d = await getJSON(`${API}/logs?limit=60`);
  document.getElementById('logs').textContent = (d.logs || []).slice().reverse()
    .map(l => `${(l.ts || '').slice(11, 19)}  ${l.type}/${l.status || l.action || ''}  ${l.reasons ? l.reasons.join(',') : (l.error || '')}`).join('\n') || 'No logs.';
}
async function loadDoctor() {
  const d = await getJSON(`${API}/doctor`);
  const doc = d.doctor || {};
  document.getElementById('doctor').textContent = doc.healthy ? '✅ All checks passed.' : '⚠️ Issues:\n- ' + (doc.issues || []).join('\n- ');
}

async function refreshAll() { await Promise.all([loadStatus(), loadSources(), loadTargets(), loadQueue(), loadLogs(), loadDoctor()]); }

// actions
async function ctl(action) { await postJSON(`${API}/control`, { action }); toast('Mode: ' + action); refreshAll(); }
async function addSource() {
  const body = { name: v('sName'), channelId: v('sChan'), link: v('sChan'), sourceType: v('sType'), category: v('sCat'), priority: Number(v('sPri')) || 1, requireApproval: document.getElementById('sApprove').checked };
  if (!body.name) return toast('Name required');
  await postJSON(`${API}/sources`, body); toast('Source saved'); loadSources(); loadStatus();
}
async function addTarget() {
  const body = { name: v('tName'), channelId: v('tChan'), platform: v('tPlat'), branding: v('tBrand') };
  if (!body.name) return toast('Name required');
  await postJSON(`${API}/targets`, body); toast('Target saved'); loadTargets(); loadStatus();
}
async function delTarget(id) { await fetch(`${API}/targets/${id}`, { method: 'DELETE', headers: headers() }); toast('Deleted'); loadTargets(); }
async function routeTo(sourceId, targetId) {
  if (!targetId) return;
  const src = (await getJSON(`${API}/sources`)).sources.find(s => s.id === sourceId);
  const set = new Set((src.rules?.targets) || []); set.add(targetId);
  await fetch(`${API}/sources/${sourceId}`, { method: 'PUT', headers: headers(), body: JSON.stringify({ rules: { targets: [...set] } }) });
  toast('Route added'); loadSources();
}
async function qAct(id, action) { await postJSON(`${API}/queue/${id}/${action}`, {}); toast('Queue ' + action); loadQueue(); loadStatus(); }
async function qPublish(id) { const r = await postJSON(`${API}/queue/${id}/publish`, {}); toast(r.success ? 'Published' : ('Failed: ' + (r.error || ''))); loadQueue(); loadStatus(); }
async function testAutomation() {
  const r = await postJSON(`${API}/test-publish`, { text: 'Test post from Command Center 🚀' });
  toast('Test ran (dry-run): ' + ((r.result && r.result.steps || []).join(' → ')));
  loadQueue(); loadLogs();
}
async function previewFlow() {
  const body = { channelId: v('cfSource'), groupId: v('cfSource'), sourceType: v('cfType'), text: v('cfText') };
  const r = await postJSON(`${API}/content-flow/preview`, body);
  document.getElementById('flowPreview').textContent = JSON.stringify(r.preview || r, null, 2);
}
async function ingestFlowTest() {
  const sourceType = v('cfType');
  const body = { channelId: v('cfSource'), groupId: v('cfSource'), sourceType, text: v('cfText'), force: true };
  const endpoint = sourceType === 'whatsapp_group'
    ? `${API}/events/group-message`
    : sourceType === 'whatsapp_chat'
      ? `${API}/events/chat-message`
      : `${API}/events/source-post`;
  const r = await postJSON(endpoint, body);
  document.getElementById('flowPreview').textContent = JSON.stringify(r.result || r, null, 2);
  toast('Flow test queued/processed');
  loadQueue(); loadLogs(); loadStatus();
}
async function genDigest() { const r = await postJSON(`${API}/digest/generate`, {}); alert(r.digest || 'No digest'); }
async function exportCfg() {
  const r = await postJSON(`${API}/export-config`, {});
  const blob = new Blob([JSON.stringify(r.config, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'channel-automation-config.json'; a.click();
}
async function importCfg(e) {
  const file = e.target.files[0]; if (!file) return;
  const cfg = JSON.parse(await file.text());
  const r = await postJSON(`${API}/import-config`, cfg);
  toast(r.success ? `Imported ${r.sources} sources, ${r.targets} targets` : 'Import failed'); refreshAll();
}
function v(id) { return document.getElementById(id).value.trim(); }

refreshAll();
setInterval(loadStatus, 15000);
setInterval(loadQueue, 15000);
