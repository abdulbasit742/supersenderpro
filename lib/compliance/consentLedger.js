'use strict';
/**
 * consentLedger.js — Compliance Feature #1: consent + suppression (the legal backbone).
 *
 * A broadcast SaaS lives or dies on consent. If you message people who opted out, you get reported,
 * banned, or worse. This is the authoritative record of who may be contacted:
 *   - an append-only ledger of every opt-in/opt-out with source, reason, timestamp
 *   - a suppression list (current opted-out numbers)
 *   - canSend(phone) -> the single yes/no the send guard (#1) should consult before any send
 *
 * It complements the per-contact `optedIn` flag on Customer 360 by keeping the full AUDIT history
 * (when, why, from where) which you need for disputes and compliance.
 *
 * Storage: JSON (data/consent_ledger.json).
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'consent_ledger.json');

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { entries: [], suppressed: {} }; }
  catch { return { entries: [], suppressed: {} }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}
const nowIso = () => new Date().toISOString();
const normPhone = (v) => String(v || '').replace(/[^\d]/g, '');

function record(phone, action, opts = {}) {
  const p = normPhone(phone);
  if (!p) throw new Error('phone required');
  if (!['opt_in', 'opt_out'].includes(action)) throw new Error("action must be 'opt_in' or 'opt_out'");
  const data = load();
  const entry = {
    id: `CON-${Date.now()}-${Math.random().toString(16).slice(2,6)}`,
    phone: p,
    action,
    reason: opts.reason || null,
    source: opts.source || 'system',   // keyword | form | manual | import | api
    channel: opts.channel || 'whatsapp',
    at: nowIso()
  };
  data.entries.push(entry);
  if (action === 'opt_out') data.suppressed[p] = { since: entry.at, reason: entry.reason, source: entry.source };
  else delete data.suppressed[p]; // opt_in clears suppression
  save(data);
  return entry;
}

function optOut(phone, opts = {}) { return record(phone, 'opt_out', opts); }
function optIn(phone, opts = {}) { return record(phone, 'opt_in', opts); }

/** The single gate the send guard should call. Returns true if the number may be contacted. */
function canSend(phone) {
  const p = normPhone(phone);
  if (!p) return false;
  return !load().suppressed[p];
}

function isSuppressed(phone) { return !!load().suppressed[normPhone(phone)]; }
function listSuppressed() {
  const data = load();
  return Object.entries(data.suppressed).map(([phone, info]) => ({ phone, ...info }));
}

/** Full consent history for one number (for disputes/audit). */
function history(phone) {
  const p = normPhone(phone);
  return load().entries.filter(e => e.phone === p).reverse();
}

/** Bulk import a suppression list (e.g. migrating from another tool). numbers: string[] */
function importSuppression(numbers = [], source = 'import') {
  let n = 0;
  for (const num of numbers) { try { optOut(num, { source, reason: 'imported suppression' }); n++; } catch { /* skip */ } }
  return { imported: n, total: numbers.length };
}

function stats() {
  const data = load();
  const optOuts = data.entries.filter(e => e.action === 'opt_out').length;
  const optIns = data.entries.filter(e => e.action === 'opt_in').length;
  return { totalEntries: data.entries.length, optIns, optOuts, currentlySuppressed: Object.keys(data.suppressed).length };
}

module.exports = { record, optOut, optIn, canSend, isSuppressed, listSuppressed, history, importSuppression, stats };
