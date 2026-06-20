// public/js/unified-setup.js — Frontend for the Unified Setup Wizard. Calls /api/unified-setup/*.
const API = '/api/unified-setup';
async function api(p, m = 'GET', b) {
  try {
    const r = await fetch(API + p, { method: m, headers: { 'Content-Type': 'application/json' }, body: b ? JSON.stringify(b) : undefined });
    return await r.json();
  } catch (e) { return { ok: false, error: e.message }; }
}
function badge(status) { return `<span class="badge s-${status}">${(status || '').replace(/_/g, ' ')}</span>`; }

const UnifiedSetup = {
  async init() {
    await this.loadProfile();
    await this.loadReadiness();
    await this.loadPlan();
    await this.loadSteps();
    await this.loadCreds();
    await this.loadTasks();
  },
  async loadProfile() {
    const r = await api('/profile');
    const sel = document.getElementById('bp-type');
    sel.innerHTML = (r.businessTypes || []).map((t) => `<option value="${t}">${t.replace(/_/g, ' ')}</option>`).join('');
    if (r.profile) {
      document.getElementById('bp-name').value = r.profile.businessName || '';
      sel.value = r.profile.businessType || 'custom';
      document.getElementById('bp-country').value = r.profile.country || '';
      document.getElementById('bp-timezone').value = r.profile.timezone || '';
      document.getElementById('bp-currency').value = r.profile.currency || '';
      document.getElementById('bp-goals').value = (r.profile.automationGoals || []).join(', ');
    }
  },
  async saveProfile() {
    const body = {
      businessName: document.getElementById('bp-name').value,
      businessType: document.getElementById('bp-type').value,
      country: document.getElementById('bp-country').value,
      timezone: document.getElementById('bp-timezone').value,
      currency: document.getElementById('bp-currency').value,
      automationGoals: document.getElementById('bp-goals').value.split(',').map((s) => s.trim()).filter(Boolean),
    };
    await api('/profile', 'POST', body);
    document.getElementById('bp-saved').textContent = '✓ Saved';
    setTimeout(() => { document.getElementById('bp-saved').textContent = ''; }, 2000);
    this.loadReadiness(); this.loadPlan(); this.loadSteps();
  },
  async loadReadiness() {
    const r = await api('/readiness');
    const d = r.readiness || {};
    const pill = document.getElementById('us-score-pill');
    pill.textContent = `${d.score || 0} · ${(d.status || '').replace(/_/g, ' ')}`;
    const cards = [
      ['Overall', d.score || 0], ['Config', d.scores?.configScore || 0], ['Security', d.scores?.securityScore || 0],
      ['Credentials', d.scores?.credentialsScore || 0], ['Modules', d.scores?.moduleReadiness || 0], ['Dry-run', d.scores?.dryRunReadiness || 0],
    ];
    document.getElementById('us-overview').innerHTML = cards.map(([l, n]) => `<div class="us-stat"><div class="n">${n}</div><div class="l">${l}</div></div>`).join('');
    document.getElementById('us-blockers').innerHTML = (d.blockers || []).map((b) => `<div class="b">⛔ ${b}</div>`).join('') ||
      '<div class="b" style="background:rgba(34,197,94,.12);border-color:rgba(34,197,94,.3);color:#86efac">No blockers 🎉</div>';
  },
  async loadPlan() {
    const r = await api('/autopilot/plan', 'POST', {});
    const p = r.plan || {};
    document.getElementById('us-plan-type').textContent = p.label || '';
    document.querySelector('#us-plan tbody').innerHTML = (p.recommendedPath || []).map((s) =>
      `<tr><td>${s.order}</td><td>${s.title}</td><td>${badge(s.status)}</td><td>${s.required ? 'required' : (s.optional ? 'optional' : 'recommended')}</td></tr>`).join('');
  },
  async loadSteps() {
    const r = await api('/steps');
    document.getElementById('us-steps').innerHTML = (r.steps || []).map((s) => `<div class="us-step">
      <div><div class="title">${s.title} ${badge(s.status)}</div>
      <div class="meta">${s.category}${s.needsCredential ? ' · needs credential' : ''}${s.needsManualAction ? ' · manual action' : ''}</div></div>
      <div class="us-step-actions">
        <span class="us-mini" onclick="UnifiedSetup.verify('${s.id}')">Verify</span>
        <span class="us-mini" onclick="UnifiedSetup.skip('${s.id}')">Skip</span>
      </div></div>`).join('');
  },
  async verify(id) { await api(`/steps/${id}/verify`, 'POST', {}); this.loadSteps(); this.loadReadiness(); },
  async skip(id) { await api(`/steps/${id}/skip`, 'POST', {}); this.loadSteps(); this.loadReadiness(); },
  async loadCreds() {
    const r = await api('/credentials');
    document.querySelector('#us-creds tbody').innerHTML = (r.checklist || []).map((c) =>
      `<tr><td>${c.group}</td><td><code>${c.name}</code></td><td>${c.required ? 'required' : 'optional'}</td>
       <td>${c.set ? '<span class="badge s-configured">set</span>' : '<span class="badge s-not_started">missing</span>'}</td><td>${c.purpose}</td></tr>`).join('');
  },
  async loadTasks() {
    const r = await api('/tasks');
    document.querySelector('#us-tasks tbody').innerHTML = (r.tasks || []).map((t) =>
      `<tr><td>${t.title}</td><td>${t.priority}</td><td>${t.status}</td>
       <td>${t.status === 'open' || t.status === 'snoozed' ? `<span class="us-act" onclick="UnifiedSetup.taskDone('${t.id}')">Done</span><span class="us-act" onclick="UnifiedSetup.taskSkip('${t.id}')">Skip</span>` : '—'}</td></tr>`).join('') ||
      '<tr><td colspan="4" style="color:var(--muted)">No tasks yet — click Generate.</td></tr>';
  },
  async generateTasks() { await api('/tasks/generate', 'POST', {}); this.loadTasks(); },
  async taskDone(id) { await api(`/tasks/${id}/done`, 'POST', {}); this.loadTasks(); },
  async taskSkip(id) { await api(`/tasks/${id}/skip`, 'POST', {}); this.loadTasks(); },
  async exportReport() {
    const r = await api('/export-report', 'POST', {});
    document.getElementById('us-export').textContent = r.ok ? `Exported to ${r.exportedTo}\n\n` + JSON.stringify(r.report.readiness, null, 2) : 'Export failed';
  },
  async copySummary() {
    const r = await api('/readiness');
    const d = r.readiness || {};
    const text = `SuperSender Pro Setup — score ${d.score} (${d.status}). Blockers: ${d.blockers.length}. Pilot ready: ${d.readyForCloudPilot}.`;
    try { await navigator.clipboard.writeText(text); document.getElementById('us-export').textContent = 'Copied:\n' + text; }
    catch (e) { document.getElementById('us-export').textContent = text; }
  },
};
window.UnifiedSetup = UnifiedSetup;
document.addEventListener('DOMContentLoaded', () => UnifiedSetup.init());
