'use strict';
/**
 * notesAndTasks.js — CRM Feature #3: notes + follow-up tasks per customer.
 *
 * Customer 360 (#1) is identity + auto activity. This adds the HUMAN layer: free-text notes a rep
 * jots down, and follow-up tasks with due dates ("call back Tuesday", "send quote"). These are the
 * to-dos that keep deals (CRM #2) moving.
 *
 * Everything is keyed to a customer by phone, and note/task creation is mirrored onto the 360
 * timeline (injected recorder) so the profile shows the full story.
 *
 * Storage: JSON (data/crm_notes_tasks.json).
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'crm_notes_tasks.json');

let timelineRecorder = null;
function setTimelineRecorder(fn) { timelineRecorder = typeof fn === 'function' ? fn : null; }

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { notes: [], tasks: [] }; }
  catch { return { notes: [], tasks: [] }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}
const nowIso = () => new Date().toISOString();
const phoneOf = (c) => String((c && (c.phone || c.id)) || c || '').replace(/[^\d]/g, '');

function mirror(phone, text) {
  if (timelineRecorder && phone) { try { timelineRecorder(phone, { type: 'note', text, at: nowIso() }); } catch { /* ignore */ } }
}

// --- Notes ---
function addNote(customer, body, authorId = null) {
  const phone = phoneOf(customer);
  if (!phone) throw new Error('customer needs a phone');
  if (!body) throw new Error('note body required');
  const data = load();
  const note = { id: `NOTE-${Date.now()}-${Math.random().toString(16).slice(2,6)}`, phone, body, authorId, at: nowIso() };
  data.notes.push(note);
  save(data);
  mirror(phone, `Note: ${body.slice(0, 80)}`);
  return note;
}
function listNotes(customer) {
  const phone = phoneOf(customer);
  return load().notes.filter(n => n.phone === phone).reverse();
}

// --- Tasks ---
function addTask(customer, opts = {}) {
  const phone = phoneOf(customer);
  if (!phone) throw new Error('customer needs a phone');
  if (!opts.title) throw new Error('task title required');
  const data = load();
  const task = {
    id: `TASK-${Date.now()}-${Math.random().toString(16).slice(2,6)}`,
    phone,
    title: opts.title,
    dueAt: opts.dueAt || null,
    assigneeId: opts.assigneeId || null,
    status: 'open',           // open | done
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  data.tasks.push(task);
  save(data);
  mirror(phone, `Follow-up: ${opts.title}${opts.dueAt ? ` (due ${opts.dueAt})` : ''}`);
  return task;
}
function completeTask(taskId) {
  const data = load();
  const t = data.tasks.find(x => x.id === taskId);
  if (!t) return null;
  t.status = 'done';
  t.completedAt = nowIso();
  t.updatedAt = nowIso();
  save(data);
  return t;
}
function listTasks(filter = {}) {
  let rows = load().tasks;
  if (filter.customer) rows = rows.filter(t => t.phone === phoneOf(filter.customer));
  if (filter.status) rows = rows.filter(t => t.status === filter.status);
  if (filter.assigneeId) rows = rows.filter(t => t.assigneeId === filter.assigneeId);
  return rows;
}

/** Open tasks due on/before end of today. */
function dueToday() {
  const end = new Date(); end.setHours(23, 59, 59, 999);
  return load().tasks.filter(t => t.status === 'open' && t.dueAt && new Date(t.dueAt).getTime() <= end.getTime());
}
/** Open tasks past their due date. */
function overdue() {
  const now = Date.now();
  return load().tasks.filter(t => t.status === 'open' && t.dueAt && new Date(t.dueAt).getTime() < now);
}

module.exports = {
  setTimelineRecorder,
  addNote, listNotes,
  addTask, completeTask, listTasks,
  dueToday, overdue
};
