'use strict';

const $ = (id) => document.getElementById(id);
let lastProfile = null;

async function api(path, options) {
  const res = await fetch('/api/personality' + path, Object.assign({
    headers: { 'Content-Type': 'application/json' },
  }, options || {}));
  const data = await res.json();
  if (!res.ok || data.ok === false) throw new Error(data.message || data.error || 'Request failed');
  return data;
}

function renderScores(result) {
  const el = $('scoreBars');
  const segments = result.segments || [];
  el.innerHTML = segments.map((item) => `
    <div class="score-row">
      <strong>${item.type} ${item.label}</strong>
      <div class="bar"><span style="width:${Math.max(2, item.score)}%"></span></div>
      <span>${item.score}%</span>
    </div>
  `).join('');
}

function renderList(id, items) {
  $(id).innerHTML = (items || []).map((item) => `<li>${escapeHtml(item)}</li>`).join('');
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

function showResult(result, guidance) {
  lastProfile = result;
  $('resultTitle').textContent = `${result.label} (${result.primaryType}) - ${result.confidence} confidence`;
  $('resultDescription').textContent = result.description || '';
  renderScores(result);
  renderList('tipsList', (guidance && guidance.tips) || result.communicationTips || []);
  renderList('avoidList', (guidance && guidance.avoidWith) || result.avoidWith || []);
}

async function loadStatus() {
  try {
    const data = await api('/status');
    $('statusText').textContent = `Ready - ${data.stats.profileCount} saved profiles`;
    renderProfiles(data.profiles);
  } catch (error) {
    $('statusText').textContent = 'Offline';
  }
}

function renderProfiles(profiles) {
  const grid = $('profileGrid');
  grid.innerHTML = Object.keys(profiles || {}).map((type) => {
    const p = profiles[type];
    return `<div class="profile-card">
      <span class="pill">${type}</span>
      <strong>${escapeHtml(p.label)}</strong>
      <p class="muted">${escapeHtml(p.description)}</p>
      <small>${escapeHtml(p.salesApproach)}</small>
    </div>`;
  }).join('');
}

async function refreshClients() {
  const data = await api('/clients?limit=20');
  const list = $('clientList');
  if (!data.clients.length) {
    list.innerHTML = '<p class="muted">No saved profiles yet. Analyze with a client ID to build memory.</p>';
    return;
  }
  list.innerHTML = data.clients.map((client) => `
    <div class="client-card">
      <span class="pill">${client.primaryType}</span><span class="pill">${client.confidence}</span>
      <strong>${escapeHtml(client.clientId)}</strong>
      <small>${escapeHtml(client.label)} - ${client.messageCount || 0} messages - ${escapeHtml(client.updatedAt || client.analyzedAt || '')}</small>
    </div>
  `).join('');
}

async function analyze() {
  const messages = $('messages').value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const clientId = $('clientId').value.trim();
  const data = await api('/analyze', {
    method: 'POST',
    body: JSON.stringify({ clientId, messages }),
  });
  showResult(data.result, data.guidance);
  await refreshClients();
}

async function draft() {
  const data = await api('/sales-draft', {
    method: 'POST',
    body: JSON.stringify({
      clientId: $('clientId').value.trim(),
      profile: lastProfile,
      offer: $('offer').value.trim(),
      customerMessage: $('customerMessage').value.trim(),
    }),
  });
  $('draftOutput').textContent = [
    `Type: ${data.detectedType} (${data.confidence || 'unknown'})`,
    '',
    data.messagePreview,
    '',
    'Guidance:',
    data.guidance ? data.guidance.openWith : '',
  ].join('\n');
}

function loadSample() {
  $('clientId').value = 'demo_client_001';
  $('messages').value = [
    'How much is ChatGPT Plus?',
    'I need it today. Send price and delivery time.',
    'If it is ready now I can confirm.',
  ].join('\n');
  $('customerMessage').value = 'I need ChatGPT today. How much and how fast?';
}

document.addEventListener('DOMContentLoaded', () => {
  $('sampleBtn').addEventListener('click', loadSample);
  $('clearBtn').addEventListener('click', () => { $('messages').value = ''; $('clientId').value = ''; });
  $('analyzeBtn').addEventListener('click', () => analyze().catch((error) => alert(error.message)));
  $('draftBtn').addEventListener('click', () => draft().catch((error) => alert(error.message)));
  $('refreshClientsBtn').addEventListener('click', () => refreshClients().catch((error) => alert(error.message)));
  loadStatus();
  refreshClients().catch(() => {});
});
