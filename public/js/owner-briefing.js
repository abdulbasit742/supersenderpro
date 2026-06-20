// public/js/owner-briefing.js — Frontend for the Owner Daily Briefing. Calls /api/owner-briefing/*.
const API = '/api/owner-briefing';
let CURRENT = 'morning';
async function api(p, m = 'GET', b) {
  try { const r = await fetch(API + p, { method: m, headers: { 'Content-Type': 'application/json' }, body: b ? JSON.stringify(b) : undefined }); return await r.json(); }
  catch (e) { return { ok: false, error: e.message }; }
}
const OwnerBriefing = {
  async init() { await this.loadStatus(); await this.generate('morning'); await this.loadSchedule(); await this.loadHistory(); },
  async loadStatus() {
    const s = await api('/status');
    const pill = document.getElementById('ob-pill');
    pill.textContent = s.liveSend ? 'Live send capable' : 'Dry-run · Safe';
    pill.style.cssText = s.liveSend ? 'background:rgba(239,68,68,.15);color:#fca5a5;border:1px solid rgba(239,68,68,.4);padding:8px 16px;border-radius:999px;font-weight:700;font-size:13px;' : '';
  },
  async generate(kind) {
    CURRENT = kind;
    document.getElementById('tab-morning').classList.toggle('active', kind === 'morning');
    document.getElementById('tab-evening').classList.toggle('active', kind === 'evening');
    const r = await api('/generate', 'POST', { kind });
    const b = r.briefing || {};
    document.getElementById('ob-text').textContent = b.text || '(no text)';
    document.getElementById('ob-kpis').innerHTML = (b.snapshot?.kpis || []).map((k) =>
      `<div class="ob-stat"><div class="n">${k.value}</div><div class="l">${k.label}</div></div>`).join('');
    document.getElementById('ob-alerts').innerHTML = (b.alerts || []).map((a) =>
      `<div class="ob-alert sev-${a.severity}">[${a.severity}] ${a.message}</div>`).join('') || '<div class="ob-alert sev-low">No alerts 🎉</div>';
    document.getElementById('ob-actions').innerHTML = (b.actions || []).map((a) =>
      `<div class="ob-action">${a.title}${a.actionRoute ? ` — <a href="${a.actionRoute}">open</a>` : ''}</div>`).join('') || '<div class="ob-action">Nothing to do right now.</div>';
    document.getElementById('ob-packet').textContent = '';
    this.loadHistory();
  },
  async deliver() {
    const r = await api('/deliver', 'POST', { kind: CURRENT });
    document.getElementById('ob-packet').textContent = JSON.stringify(r.packet || r, null, 2);
  },
  async copy() {
    const text = document.getElementById('ob-text').textContent;
    try { await navigator.clipboard.writeText(text); document.getElementById('ob-packet').textContent = 'Copied to clipboard.'; }
    catch (e) { document.getElementById('ob-packet').textContent = text; }
  },
  async loadSchedule() {
    const r = await api('/schedule');
    const s = r.schedule || {};
    document.getElementById('ob-schedule').textContent = `Schedule (${s.timezone}): morning ${s.morning}, evening ${s.evening}. ${s.note || ''}`;
  },
  async loadHistory() {
    const r = await api('/history?limit=10');
    document.getElementById('ob-history').innerHTML = (r.history || []).map((h) =>
      `<div>${h.at} · ${h.kind} · ${h.alertCount} alerts · ${h.actionCount} actions</div>`).join('') || '<div>No briefings generated yet.</div>';
  },
};
window.OwnerBriefing = OwnerBriefing;
document.addEventListener('DOMContentLoaded', () => OwnerBriefing.init());
