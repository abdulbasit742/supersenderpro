// lib/tasks/taskStore.js — Task persistence + lifecycle. A task: { id, title, notes, contact?,
// ticketId?, assignee?, priority, status, dueAt?, createdAt, updatedAt, completedAt? }. Tasks are
// cancelled/done, never hard-deleted. Linking to a contact/ticket lets the 360 view + routing
// reference the same work item.

const store = require('./store');
const { config, STATUSES, PRIORITIES } = require('./config');
const { maskContact } = require('./privacy');

function publicView(t) {
 if (!t) return null;
 return { id: t.id, title: t.title, notes: t.notes || '', contactMasked: t.contact ? maskContact(t.contact) : null, ticketId: t.ticketId || null, assignee: t.assignee || null, priority: t.priority, status: t.status, dueAt: t.dueAt || null, createdAt: t.createdAt, updatedAt: t.updatedAt, completedAt: t.completedAt || null };
}

function create({ title, notes = '', contact, ticketId, assignee, priority = 'normal', dueAt } = {}) {
 if (!title) throw new Error('title is required');
 if (!PRIORITIES.includes(priority)) throw new Error('invalid priority');
 if (dueAt && Number.isNaN(Date.parse(dueAt))) throw new Error('invalid dueAt');
 const d = store.load();
 if (d.tasks.length >= config.maxTasks) throw new Error('task cap reached');
 const now = store.nowIso();
 const t = {
 id: store.genId('task'), title: String(title), notes: String(notes || ''),
 contact: contact ? String(contact) : null, ticketId: ticketId ? String(ticketId) : null,
 assignee: assignee ? String(assignee) : null, priority, status: 'open',
 dueAt: dueAt || null, createdAt: now, updatedAt: now, completedAt: null,
 };
 d.tasks.push(t); store.save(d);
 return publicView(t);
}

function _get(d, id) { return d.tasks.find((t) => t.id === id); }

function update(id, changes = {}) {
 const d = store.load(); const t = _get(d, id);
 if (!t) throw new Error('task not found');
 if (changes.title !== undefined) t.title = String(changes.title);
 if (changes.notes !== undefined) t.notes = String(changes.notes);
 if (changes.assignee !== undefined) t.assignee = changes.assignee ? String(changes.assignee) : null;
 if (changes.priority !== undefined) { if (!PRIORITIES.includes(changes.priority)) throw new Error('invalid priority'); t.priority = changes.priority; }
 if (changes.dueAt !== undefined) { if (changes.dueAt && Number.isNaN(Date.parse(changes.dueAt))) throw new Error('invalid dueAt'); t.dueAt = changes.dueAt || null; if (changes.dueAt) { const d2 = store.load(); delete d2.remindersFired[id]; /* reschedule reminder */ } }
 t.updatedAt = store.nowIso(); store.save(d);
 return publicView(t);
}

function setStatus(id, status) {
 if (!STATUSES.includes(status)) throw new Error('invalid status');
 const d = store.load(); const t = _get(d, id);
 if (!t) throw new Error('task not found');
 t.status = status; t.updatedAt = store.nowIso();
 if (status === 'done') t.completedAt = t.updatedAt; else if (status !== 'cancelled') t.completedAt = null;
 store.save(d);
 return publicView(t);
}
function assign(id, assignee) { return update(id, { assignee }); }

function all() { return store.load().tasks; }
function get(id) { return publicView(_get(store.load(), id)); }
function raw(id) { return _get(store.load(), id); }

function list({ status, assignee, priority, contact, ticketId, limit = 200 } = {}) {
 let items = store.load().tasks.slice();
 if (status) items = items.filter((t) => t.status === status);
 if (assignee) items = items.filter((t) => String(t.assignee || '') === String(assignee));
 if (priority) items = items.filter((t) => t.priority === priority);
 if (contact) items = items.filter((t) => String(t.contact || '') === String(contact));
 if (ticketId) items = items.filter((t) => String(t.ticketId || '') === String(ticketId));
 // Sort: open first, then by due date (soonest first, nulls last), then priority.
 const prRank = { urgent: 0, high: 1, normal: 2, low: 3 };
 items.sort((a, b) => {
 const da = a.dueAt ? Date.parse(a.dueAt) : Infinity;
 const db = b.dueAt ? Date.parse(b.dueAt) : Infinity;
 if (da !== db) return da - db;
 return (prRank[a.priority] || 2) - (prRank[b.priority] || 2);
 });
 return items.slice(0, limit).map(publicView);
}

module.exports = { create, update, setStatus, assign, all, get, raw, list, publicView };
