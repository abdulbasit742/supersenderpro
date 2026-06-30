// lib/broadcast/broadcastEngine.js — core compose/queue/dispatch logic
// Draft-safe: when config.live is false, every recipient is marked 'draft' and
// no notifier is invoked. Consent (#38) and sender-health (#30) are enforced
// best-effort when those depts are present.
'use strict';

const { config } = require('./config');
const store = require('./store');
const { resolve } = require('./recipientResolver');
const notify = require('./notify');

// Best-effort consent check. Returns true (allowed) if consent dept absent.
function consentOk(tenantId, phone) {
  if (!config.enforceConsent) return true;
  try {
    // eslint-disable-next-line global-require
    const consent = require('../consent');
    if (consent && typeof consent.isOptedOut === 'function') {
      return !consent.isOptedOut(tenantId, phone);
    }
  } catch (_) {}
  return true;
}

// Best-effort sender-health gate. Returns true if health dept absent.
function healthOk(tenantId) {
  if (!config.enforceSenderHealth) return true;
  try {
    // eslint-disable-next-line global-require
    const health = require('../senderHealth');
    if (health && typeof health.canSend === 'function') {
      return !!health.canSend(tenantId);
    }
  } catch (_) {}
  return true;
}

// Create a campaign in 'draft' state with a resolved recipient roster.
function createCampaign(tenantId, { name, message, segmentId, recipients } = {}) {
  if (!message || !String(message).trim()) throw new Error('broadcast: message required');
  const roster = resolve(tenantId, { recipients, segmentId });
  if (roster.length === 0) throw new Error('broadcast: no recipients resolved');

  const targets = roster.map(r => ({
    ...r,
    status: 'pending',   // pending | draft | sent | skipped | failed
    reason: null,
    at: null,
  }));

  return store.insert(tenantId, {
    name: name || 'Untitled broadcast',
    message: String(message),
    segmentId: segmentId || null,
    state: 'draft',      // draft | dispatched | done
    stats: { total: targets.length, sent: 0, draft: 0, skipped: 0, failed: 0 },
    targets,
  });
}

// Dispatch a campaign. Honors gating; respects draft-safe mode.
function dispatch(tenantId, id) {
  const c = store.get(tenantId, id);
  if (!c) throw new Error('broadcast: campaign not found');
  if (c.state === 'done') return c;

  if (!healthOk(tenantId)) {
    return store.update(tenantId, id, { state: 'draft', lastError: 'sender-health gate blocked dispatch' });
  }

  const stats = { total: c.targets.length, sent: 0, draft: 0, skipped: 0, failed: 0 };
  const targets = c.targets.map(t => {
    if (!consentOk(tenantId, t.phone)) {
      stats.skipped++;
      return { ...t, status: 'skipped', reason: 'opted-out', at: new Date().toISOString() };
    }
    if (!config.live) {
      stats.draft++;
      return { ...t, status: 'draft', reason: 'draft-safe mode', at: new Date().toISOString() };
    }
    const res = notify.send({ tenantId, phone: t.phone, message: c.message });
    if (res && res.ok) { stats.sent++; return { ...t, status: 'sent', at: new Date().toISOString() }; }
    stats.failed++;
    return { ...t, status: 'failed', reason: (res && res.error) || 'send failed', at: new Date().toISOString() };
  });

  const state = config.live ? 'done' : 'dispatched';
  return store.update(tenantId, id, { state, stats, targets });
}

module.exports = { createCampaign, dispatch, consentOk, healthOk };
