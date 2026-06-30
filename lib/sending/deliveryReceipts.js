'use strict';
/**
 * deliveryReceipts.js — Sending Feature #4: outbound delivery + read receipts.
 *
 * Knowing a message was sent isn't enough — was it delivered? read? This tracks the status of each
 * outbound message (sent -> delivered -> read, or failed) using the receipts the WhatsApp engine
 * emits, and rolls them up into delivery/read rates per campaign and overall. Read events also feed
 * smart-send-time (#3) as engagement signals.
 *
 * Decoupled: an optional engagement hook is injected. Storage: JSON (data/delivery_receipts.json).
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'delivery_receipts.json');
const FLOW = { sent: 0, delivered: 1, read: 2 };

let onRead = null; // (phone) => void   (e.g. smartSendTime.recordEngagement)
function setOnRead(fn) { onRead = typeof fn === 'function' ? fn : null; }

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { messages: {} }; }
  catch { return { messages: {} }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}
const nowIso = () => new Date().toISOString();
const normPhone = (v) => String(v || '').replace(/[^\d]/g, '');

/** Register an outbound message when it's sent. */
function track(messageId, opts = {}) {
  if (!messageId) throw new Error('messageId required');
  const data = load();
  data.messages[messageId] = {
    messageId,
    phone: normPhone(opts.phone),
    campaignId: opts.campaignId || null,
    status: 'sent',
    sentAt: nowIso(),
    deliveredAt: null,
    readAt: null,
    error: null
  };
  save(data);
  return data.messages[messageId];
}

/** Update status from a receipt. status: delivered|read|failed. Only advances forward. */
function updateStatus(messageId, status, error) {
  const data = load();
  const m = data.messages[messageId];
  if (!m) return null;
  if (status === 'failed') {
    m.status = 'failed'; m.error = error || 'failed'; m.failedAt = nowIso();
  } else if (FLOW[status] != null && FLOW[status] > (FLOW[m.status] ?? -1)) {
    m.status = status;
    if (status === 'delivered') m.deliveredAt = nowIso();
    if (status === 'read') {
      m.readAt = nowIso();
      if (onRead && m.phone) { try { onRead(m.phone); } catch { /* ignore */ } }
    }
  }
  save(data);
  return m;
}

function getMessage(messageId) { return load().messages[messageId] || null; }

/** Rates overall or for one campaign. */
function rates(campaignId) {
  const data = load();
  let sent = 0, delivered = 0, read = 0, failed = 0;
  for (const m of Object.values(data.messages)) {
    if (campaignId && m.campaignId !== campaignId) continue;
    sent++;
    if (m.status === 'failed') failed++;
    if (m.deliveredAt || m.status === 'read') delivered++;
    if (m.readAt) read++;
  }
  const pct = (a, b) => b ? Math.round((a / b) * 1000) / 10 : 0;
  return { sent, delivered, read, failed, deliveryRatePct: pct(delivered, sent), readRatePct: pct(read, sent) };
}

module.exports = { setOnRead, track, updateStatus, getMessage, rates };
