'use strict';
/**
 * numberManager.js — Channels Feature #1: manage multiple WhatsApp numbers per tenant.
 *
 * One number can only safely send so much before WhatsApp flags it. Serious senders rotate across
 * several numbers. This tracks a tenant's numbers, their status (warming/active/banned), and picks
 * the best number for the next send to spread volume and ban risk.
 *
 * Works with the send guard (#sending1): the guard enforces per-number caps; this chooses WHICH
 * number to use so you stay under caps across a pool.
 *
 * Storage: JSON (data/wa_numbers.json).
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'wa_numbers.json');

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { numbers: [] }; }
  catch { return { numbers: [] }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}
const nowIso = () => new Date().toISOString();
const normPhone = (v) => String(v || '').replace(/[^\d]/g, '');
const STATUSES = ['warming', 'active', 'paused', 'banned'];

/**
 * Register a number. New numbers start 'warming' (low cap) so you don't blast a fresh number.
 * @param {Object} opts { tenantId, phone, label?, dailyCap? }
 */
function registerNumber(opts = {}) {
  if (!opts.tenantId) throw new Error('tenantId required');
  const phone = normPhone(opts.phone);
  if (!phone) throw new Error('valid phone required');
  const data = load();
  if (data.numbers.some(n => n.tenantId === String(opts.tenantId) && n.phone === phone)) {
    throw new Error('number already registered');
  }
  const num = {
    id: `WA-${Date.now()}-${Math.random().toString(16).slice(2,6)}`,
    tenantId: String(opts.tenantId),
    phone,
    label: opts.label || phone,
    status: 'warming',
    dailyCap: Number(opts.dailyCap || 250),   // conservative while warming
    sentToday: 0,
    sentWindow: null,                          // YYYY-MM-DD
    lastSentAt: null,
    createdAt: nowIso()
  };
  data.numbers.push(num);
  save(data);
  return num;
}

function listNumbers(tenantId) {
  const data = load();
  return data.numbers.filter(n => !tenantId || n.tenantId === String(tenantId));
}

function setStatus(id, status) {
  if (!STATUSES.includes(status)) throw new Error(`invalid status. use: ${STATUSES.join(', ')}`);
  const data = load();
  const n = data.numbers.find(x => x.id === id);
  if (!n) return null;
  n.status = status;
  if (status === 'active' && n.dailyCap < 1000) n.dailyCap = 1000; // graduate from warming
  n.updatedAt = nowIso();
  save(data);
  return n;
}

function todayKey() { const d = new Date(); return `${d.getUTCFullYear()}-${d.getUTCMonth()+1}-${d.getUTCDate()}`; }

function rollWindow(n) {
  const k = todayKey();
  if (n.sentWindow !== k) { n.sentWindow = k; n.sentToday = 0; }
}

/**
 * Pick the best number to send from for a tenant: an active (or warming) number with the most
 * remaining daily capacity. Returns the number record or null if none available.
 */
function pickNumber(tenantId) {
  const data = load();
  const pool = data.numbers.filter(n => n.tenantId === String(tenantId) && (n.status === 'active' || n.status === 'warming'));
  let best = null, bestRemaining = -1;
  for (const n of pool) {
    rollWindow(n);
    const remaining = n.dailyCap - n.sentToday;
    if (remaining > bestRemaining) { best = n; bestRemaining = remaining; }
  }
  if (best) save(data); // window rolls persisted
  return best && bestRemaining > 0 ? best : null;
}

/** Record that a number sent n messages (call after a successful send). */
function recordSend(id, n = 1) {
  const data = load();
  const num = data.numbers.find(x => x.id === id);
  if (!num) return null;
  rollWindow(num);
  num.sentToday += n;
  num.lastSentAt = nowIso();
  save(data);
  return num;
}

function stats(tenantId) {
  const pool = listNumbers(tenantId);
  return {
    total: pool.length,
    active: pool.filter(n => n.status === 'active').length,
    warming: pool.filter(n => n.status === 'warming').length,
    banned: pool.filter(n => n.status === 'banned').length,
    capacityToday: pool.reduce((s, n) => s + Math.max(0, n.dailyCap - n.sentToday), 0)
  };
}

module.exports = { STATUSES, registerNumber, listNumbers, setStatus, pickNumber, recordSend, stats };
