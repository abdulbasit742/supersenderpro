'use strict';
/**
 * reminders.js — CRM Feature #6: time-based reminders on contacts.
 *
 * Notes/tasks (#crm3) capture to-dos; reminders add the "poke me at this time" layer: "call Ali
 * back at 4pm", "follow up Friday". A tick() sweep finds due reminders and fires a notify hook (so
 * it can WhatsApp the assignee via notifications #notify1). Snooze + complete supported.
 *
 * Storage: JSON (data/reminders.json).
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'reminders.json');

let notifier = null; // async (reminder) => void  (e.g. notify the assignee)
function setNotifier(fn) { notifier = typeof fn === 'function' ? fn : null; }

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { reminders: [] }; }
  catch { return { reminders: [] }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}
const nowMs = () => Date.now();
const iso = (ms) => new Date(ms).toISOString();
const normPhone = (v) => String(v || '').replace(/[^\d]/g, '');

function create(opts = {}) {
  const phone = normPhone(opts.contactPhone);
  if (!opts.text) throw new Error('reminder text required');
  const dueAt = typeof opts.dueAt === 'number' ? opts.dueAt : new Date(opts.dueAt || Date.now()).getTime();
  if (Number.isNaN(dueAt)) throw new Error('invalid dueAt');
  const data = load();
  const reminder = {
    id: `REM-${Date.now()}-${Math.random().toString(16).slice(2,6)}`,
    contactPhone: phone || null,
    text: opts.text,
    assigneeId: opts.assigneeId || null,
    dueAt,
    status: 'pending',   // pending | done | snoozed
    firedAt: null,
    createdAt: iso(nowMs())
  };
  data.reminders.push(reminder);
  save(data);
  return reminder;
}

function complete(id) {
  const data = load();
  const r = data.reminders.find(x => x.id === id);
  if (!r) return null;
  r.status = 'done'; r.completedAt = iso(nowMs());
  save(data);
  return r;
}

function snooze(id, minutes = 60) {
  const data = load();
  const r = data.reminders.find(x => x.id === id);
  if (!r) return null;
  r.dueAt = nowMs() + Number(minutes) * 60000;
  r.status = 'pending'; r.firedAt = null;
  save(data);
  return r;
}

function list(filter = {}) {
  let rows = load().reminders;
  if (filter.status) rows = rows.filter(r => r.status === filter.status);
  if (filter.assigneeId) rows = rows.filter(r => r.assigneeId === filter.assigneeId);
  if (filter.contactPhone) rows = rows.filter(r => r.contactPhone === normPhone(filter.contactPhone));
  rows.sort((a, b) => a.dueAt - b.dueAt);
  return rows;
}

/** Fire due reminders. Call on an interval (every minute). Returns count fired. */
async function tick() {
  const data = load();
  const t = nowMs();
  let fired = 0;
  for (const r of data.reminders) {
    if (r.status !== 'pending') continue;
    if (t < r.dueAt) continue;
    r.status = 'done'; // fire once; user re-snoozes if needed
    r.firedAt = iso(t);
    fired++;
    if (notifier) { try { await notifier(r); } catch { /* never throw */ } }
  }
  if (fired) save(data);
  return { fired, at: iso(t) };
}

module.exports = { setNotifier, create, complete, snooze, list, tick };
