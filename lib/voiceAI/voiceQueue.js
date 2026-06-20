// lib/voiceAI/voiceQueue.js — Queue of voice generation/sending drafts.
// Every item is approvalRequired + dryRun by default. No live send happens here.

const { config } = require('./config');
const { readJSON, writeJSON } = require('./jsonStore');
const { preview, maskId } = require('./redaction');
const auditLog = require('./auditLog');

function _load() { return readJSON(config.paths.queue, { items: [] }); }
function _save(d) { return writeJSON(config.paths.queue, d); }
function all() { const d = _load(); return Array.isArray(d.items) ? d.items : []; }
function get(id) { return all().find((i) => i.id === id) || null; }

function createDraft(input = {}) {
  const d = _load();
  d.items = Array.isArray(d.items) ? d.items : [];
  if (d.items.length >= config.maxQueue) {
    return { ok: false, error: 'queue_full' };
  }
  const item = {
    id: `vq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: input.type || 'voice_reply',
    customerId: input.customerId || null,
    targetChannel: input.targetChannel || 'whatsapp',
    provider: input.provider || config.defaultProvider,
    voiceIdMasked: maskId(input.voiceId || 'default'),
    textPreview: preview(input.text || ''),
    transcriptPreview: input.transcript ? preview(input.transcript) : null,
    status: 'approval_pending',
    approvalRequired: true,
    approvedBy: null,
    scheduledAt: null,
    attempts: 0,
    dryRun: true,
    warnings: input.warnings || [],
    createdAt: new Date().toISOString(),
  };
  d.items.push(item);
  _save(d);
  auditLog.record('voice_draft_created', { id: item.id, type: item.type, channel: item.targetChannel });
  return { ok: true, item };
}

function _update(id, patch) {
  const d = _load();
  const idx = (d.items || []).findIndex((i) => i.id === id);
  if (idx < 0) return null;
  d.items[idx] = { ...d.items[idx], ...patch };
  _save(d);
  return d.items[idx];
}

function approve(id, approvedBy = 'admin') {
  const item = _update(id, { status: 'approved', approvalRequired: false, approvedBy });
  if (item) auditLog.record('voice_draft_approved', { id, approvedBy });
  return item;
}
function reject(id, by = 'admin', reason = '') {
  const item = _update(id, { status: 'skipped', approvedBy: by });
  if (item) auditLog.record('voice_draft_rejected', { id, by, reason });
  return item;
}
function schedule(id, scheduledAt) {
  return _update(id, { status: 'approved', scheduledAt });
}
function cancel(id) { return _update(id, { status: 'skipped' }); }
function retry(id) {
  const item = get(id);
  if (!item) return null;
  return _update(id, { status: 'approval_pending', attempts: (item.attempts || 0) + 1 });
}
// "Send" never goes live by default — it only marks a dry-run send + builds a manual packet.
function markSentDryRun(id) {
  const item = _update(id, { status: 'sent', dryRun: true });
  if (item) auditLog.record('voice_dry_run_send', { id, channel: item.targetChannel });
  return item;
}
function archive(id) { return _update(id, { status: 'archived' }); }

function pending() { return all().filter((i) => i.status === 'approval_pending'); }

module.exports = { all, get, createDraft, approve, reject, schedule, cancel, retry, markSentDryRun, archive, pending };
