// lib/supportInbox/ticketStore.js — Persistence for support tickets. Tickets are never
// hard-deleted; status moves to closed. Messages append to a ticket thread.

const store = require('./store');

function all() { return store.load().tickets; }
function getById(id) { return all().find((t) => t.id === id) || null; }
function getByNumber(num) { return all().find((t) => t.number === num) || null; }
function forContact(contact) { return all().filter((t) => String(t.contact) === String(contact)); }
function forAssignee(agent) { return all().filter((t) => String(t.assignee || '') === String(agent)); }

function upsert(ticket) {
 const d = store.load();
 const idx = d.tickets.findIndex((t) => t.id === ticket.id);
 if (idx >= 0) d.tickets[idx] = ticket; else d.tickets.push(ticket);
 store.save(d);
 return ticket;
}

module.exports = { all, getById, getByNumber, forContact, forAssignee, upsert };
