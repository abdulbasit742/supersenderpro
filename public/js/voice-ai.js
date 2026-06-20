// public/js/voice-ai.js — Frontend for the Voice AI Command Center dashboard.
// Talks only to /api/voice-ai/* endpoints. All actions are dry-run / approval-based.
const API = '/api/voice-ai';

async function api(path, method = 'GET', body) {
  try {
    const res = await fetch(API + path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    return await res.json();
  } catch (e) { return { ok: false, error: e.message }; }
}

const VoiceAI = {
  async init() {
    await this.loadStatus();
    await this.loadProviders();
    await this.loadQueue();
    await this.loadConversations();
    await this.loadTemplates();
    await this.loadAudit();
  },

  async loadStatus() {
    const s = await api('/status');
    const pill = document.getElementById('va-status-pill');
    const anyLive = s.live && (s.live.tts || s.live.stt || s.live.send);
    pill.textContent = anyLive ? 'LIVE MODE' : 'Dry-run · Safe';
    pill.className = 'va-pill ' + (anyLive ? 'va-pill-live' : 'va-pill-safe');
    const dg = await api('/digest/generate', 'POST');
    const d = dg.digest || {};
    const cards = [
      ['Voice conversations', d.voiceConversations || 0],
      ['Approvals pending', s.pendingApprovals || 0],
      ['Negative sentiment', d.negativeSentiment || 0],
      ['Failed jobs', d.failedJobs || 0],
      ['Default provider', s.defaultProvider || '—'],
      ['Default language', s.defaultLanguage || '—'],
    ];
    document.getElementById('va-overview').innerHTML = cards.map(
      ([l, n]) => `<div class="va-stat"><div class="n">${n}</div><div class="l">${l}</div></div>`).join('');
  },

  async loadProviders() {
    const r = await api('/providers');
    const tb = document.querySelector('#va-providers tbody');
    const sel = document.getElementById('tts-provider');
    tb.innerHTML = (r.providers || []).map((p) => `<tr>
      <td>${p.label}</td>
      <td>${(p.capabilities || []).join(', ')}</td>
      <td>${p.requiresApiKey ? (p.apiKeyPresent ? '<span class="va-badge va-badge-ok">present</span>' : '<span class="va-badge va-badge-warn">missing</span>') : '<span class="va-badge va-badge-ok">n/a</span>'}</td>
      <td>${p.enabled ? '<span class="va-badge va-badge-ok">ready</span>' : '<span class="va-badge va-badge-warn">disabled</span>'}</td>
      <td>${p.riskLevel}</td></tr>`).join('');
    sel.innerHTML = (r.providers || []).map((p) => `<option value="${p.id}">${p.label}</option>`).join('');
  },

  async ttsPreview() {
    const body = {
      text: document.getElementById('tts-text').value,
      language: document.getElementById('tts-language').value,
      tone: document.getElementById('tts-tone').value,
      provider: document.getElementById('tts-provider').value,
    };
    const r = await api('/tts/preview', 'POST', body);
    document.getElementById('tts-out').textContent = JSON.stringify(r.result || r, null, 2);
  },

  async sttPreview() {
    const body = {
      sourceType: document.getElementById('stt-source').value,
      customerId: document.getElementById('stt-customer').value || null,
      audioMimeType: document.getElementById('stt-mime').value,
    };
    const r = await api('/stt/preview', 'POST', body);
    document.getElementById('stt-out').textContent = JSON.stringify(r.result || r, null, 2);
  },

  async loadQueue() {
    const r = await api('/queue');
    const tb = document.querySelector('#va-queue tbody');
    tb.innerHTML = (r.queue || []).slice().reverse().map((i) => `<tr>
      <td>${i.id}</td><td>${i.type}</td><td>${i.targetChannel}</td>
      <td>${(i.textPreview || '').slice(0, 40)}</td>
      <td>${i.status}</td>
      <td>${i.status === 'approval_pending' ? `<span class="va-act" onclick="VoiceAI.approve('${i.id}')">Approve</span><span class="va-act reject" onclick="VoiceAI.reject('${i.id}')">Reject</span>` : '—'}</td>
    </tr>`).join('') || '<tr><td colspan="6" style="color:var(--muted)">No drafts yet.</td></tr>';
  },
  async approve(id) { await api(`/queue/${id}/approve`, 'POST', {}); this.loadQueue(); this.loadStatus(); },
  async reject(id) { await api(`/queue/${id}/reject`, 'POST', {}); this.loadQueue(); this.loadStatus(); },

  async loadConversations() {
    const r = await api('/conversations');
    const tb = document.querySelector('#va-conversations tbody');
    tb.innerHTML = (r.conversations || []).slice().reverse().map((c) => `<tr>
      <td>${c.customerNameSafe || 'Customer'} ${c.customerPhoneMasked || ''}</td>
      <td>${c.channel}</td><td>${(c.transcriptPreview || '').slice(0, 40)}</td>
      <td>${c.intent || '—'}</td><td>${c.sentiment || '—'}</td><td>${c.status}</td>
    </tr>`).join('') || '<tr><td colspan="6" style="color:var(--muted)">No voice conversations yet.</td></tr>';
  },

  async loadTemplates() {
    const lang = document.getElementById('tpl-language').value;
    const r = await api('/templates' + (lang ? `?language=${lang}` : ''));
    document.getElementById('va-templates').innerHTML = (r.templates || []).map((t) => `<div class="va-tpl">
      <div class="cat">${t.category} · ${t.language}</div><div>${t.text}</div></div>`).join('');
  },

  async productVoiceover() {
    const body = {
      product: document.getElementById('vo-product').value,
      price: document.getElementById('vo-price').value || null,
      highlight: document.getElementById('vo-highlight').value,
    };
    const r = await api('/ecommerce/voiceover', 'POST', body);
    document.getElementById('vo-out').textContent = JSON.stringify(r.result || r, null, 2);
  },

  async runDoctor() {
    const r = await api('/doctor');
    const d = r.doctor || {};
    document.getElementById('doctor-out').textContent =
      `Healthy: ${d.healthy} | ok=${d.summary?.ok} warn=${d.summary?.warn} fail=${d.summary?.fail}\n\n` +
      (d.checks || []).map((c) => `[${c.status}] ${c.id}: ${c.message}`).join('\n');
  },

  async loadAudit() {
    const r = await api('/audit?limit=20');
    document.getElementById('va-audit').innerHTML = (r.audit || []).map((a) =>
      `<div>${a.at} · <strong>${a.event}</strong> ${a.dryRun ? '(dry-run)' : ''}</div>`).join('') || '<div>No audit events.</div>';
  },
};

window.VoiceAI = VoiceAI;
document.addEventListener('DOMContentLoaded', () => VoiceAI.init());
