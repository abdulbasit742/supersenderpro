// lib/supportInbox/ticketEngine.js — Core ticket lifecycle: open from an inbound message,
// append thread messages, assign, reprioritize, tag, respond (draft), resolve, reopen, close.
// Idempotent-ish: opening with the same contact + an open ticket appends instead of duplicating.

const store = require('./store');
const ticketStore = require('./ticketStore');
const autoTriage = require('./autoTriage');
const sla = require('./slaPolicy');
const canned = require('./cannedReplies');
const notify = require('./notify');
const { config } = require('./config');
const { maskContact, maskName } = require('./privacy');

const STATUSES = ['open', 'pending', 'resolved', 'closed'];
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];

function publicView(t) {
 if (!t) return null;
 return {
 id: t.id, number: t.number, status: t.status, priority: t.priority, category: t.category,
 contactMasked: maskContact(t.contact), nameMasked: maskName(t.name), subject: t.subject,
 assignee: t.assignee || null, tags: t.tags || [], channel: t.channel,
 messageCount: (t.messages || []).length,
 createdAt: t.createdAt, updatedAt: t.updatedAt,
 firstRespondedAt: t.firstRespondedAt || null, resolvedAt: t.resolvedAt || null, closedAt: t.closedAt || null,
 sla: sla.evaluate(t),
 };
}

function _openTicketForContact(contact) {
 return ticketStore.forContact(contact).find((t) => ['open', 'pending'].includes(t.status)) || null;
}

// Open a ticket from an inbound message (or append to the contact's existing open ticket).
function openFromMessage({ contact, name = '', text = '', channel = 'whatsapp', subject = '' } = {}) {
 if (!contact) throw new Error('contact is required');
 const existing = _openTicketForContact(contact);
 const now = store.nowIso();
 const msg = { id: store.genId('msg'), direction: 'in', text: String(text || ''), at: now };
 if (existing) {
 existing.messages.push(msg);
 existing.updatedAt = now;
 ticketStore.upsert(existing);
 return { ticket: publicView(existing), appended: true };
 }
 const tri = autoTriage.triage(text);
 const ticket = {
 id: store.genId('tkt'), number: store.nextTicketNumber(),
 contact: String(contact), name: String(name || ''),
 channel, subject: subject || (String(text || '').slice(0, 60) || 'New conversation'),
 status: 'open', priority: tri.priority || config.defaultPriority, category: tri.category,
 assignee: null, tags: tri.matched ? [tri.category] : [],
 messages: [msg],
 firstRespondedAt: null, resolvedAt: null, closedAt: null,
 createdAt: now, updatedAt: now,
 };
 ticketStore.upsert(ticket);
 return { ticket: publicView(ticket), appended: false };
}

function assign(id, agent) {
 const t = ticketStore.getById(id); if (!t) throw new Error('ticket not found');
 t.assignee = agent || null; t.updatedAt = store.nowIso();
 if (t.status === 'open') t.status = 'pending';
 ticketStore.upsert(t); return publicView(t);
}
function setPriority(id, priority) {
 if (!PRIORITIES.includes(priority)) throw new Error('invalid priority');
 const t = ticketStore.getById(id); if (!t) throw new Error('ticket not found');
 t.priority = priority; t.updatedAt = store.nowIso(); ticketStore.upsert(t); return publicView(t);
}
function addTag(id, tag) {
 const t = ticketStore.getById(id); if (!t) throw new Error('ticket not found');
 t.tags = Array.from(new Set([...(t.tags || []), String(tag)])); t.updatedAt = store.nowIso();
 ticketStore.upsert(t); return publicView(t);
}

// Agent reply — drafted by default; marks first-response SLA when first outbound goes out.
async function respond(id, { text, cannedId, agent = 'Support', ctx = {} } = {}) {
 const t = ticketStore.getById(id); if (!t) throw new Error('ticket not found');
 let body = text;
 if (!body && cannedId) body = canned.render(cannedId, { name: t.name, ticket: t.number, agent, ...ctx });
 if (!body) throw new Error('text or cannedId required');
 const res = await notify.dispatch(t.contact, body, { kind: 'support_reply', ticket: t.number });
 const now = store.nowIso();
 t.messages.push({ id: store.genId('msg'), direction: 'out', text: body, agent, at: now, sent: res.sent });
 if (!t.firstRespondedAt) t.firstRespondedAt = now;
 if (t.status === 'open') t.status = 'pending';
 t.updatedAt = now;
 ticketStore.upsert(t);
 return { ticket: publicView(t), reply: { sent: res.sent, draft: !res.sent, preview: res.preview || body } };
}

function resolve(id) {
 const t = ticketStore.getById(id); if (!t) throw new Error('ticket not found');
 t.status = 'resolved'; t.resolvedAt = store.nowIso(); t.updatedAt = t.resolvedAt;
 ticketStore.upsert(t); return publicView(t);
}
function reopen(id) {
 const t = ticketStore.getById(id); if (!t) throw new Error('ticket not found');
 t.status = 'open'; t.resolvedAt = null; t.closedAt = null; t.updatedAt = store.nowIso();
 ticketStore.upsert(t); return publicView(t);
}
function close(id) {
 const t = ticketStore.getById(id); if (!t) throw new Error('ticket not found');
 t.status = 'closed'; t.closedAt = store.nowIso(); if (!t.resolvedAt) t.resolvedAt = t.closedAt; t.updatedAt = t.closedAt;
 ticketStore.upsert(t); return publicView(t);
}

function list({ status, assignee, priority, limit = 100 } = {}) {
 let items = ticketStore.all();
 if (status) items = items.filter((t) => t.status === status);
 if (assignee) items = items.filter((t) => String(t.assignee || '') === String(assignee));
 if (priority) items = items.filter((t) => t.priority === priority);
 return items.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).slice(0, limit).map(publicView);
}
function get(id) { return publicView(ticketStore.getById(id)); }

function overview() {
 const items = ticketStore.all();
 const by = (s) => items.filter((t) => t.status === s).length;
 return {
 generatedAt: store.nowIso(),
 liveReplies: config.effective.liveReplies,
 cards: {
 open: by('open'), pending: by('pending'), resolved: by('resolved'), closed: by('closed'),
 unassigned: items.filter((t) => !t.assignee && ['open', 'pending'].includes(t.status)).length,
 slaBreaches: sla.breaches(items).length,
 },
 breaches: sla.breaches(items),
 };
}

module.exports = { STATUSES, PRIORITIES, openFromMessage, assign, setPriority, addTag, respond, resolve, reopen, close, list, get, overview, publicView };
