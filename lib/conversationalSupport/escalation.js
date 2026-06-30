'use strict';
/**
 * lib/conversationalSupport/escalation.js - human handoff. Creates a tenant-scoped handoff ticket
 * and best-effort pings the admin via lib/adminAlert (optional dependency). Never throws.
 */
const { paths } = require('./config');
const store = require('./store');

let adminAlert = null;
try { adminAlert = require('../adminAlert'); } catch {}

function list(tid, status) {
  const items = store.readJSON(paths.handoffs(tid), { handoffs: [] }).handoffs;
  return status ? items.filter((h) => h.status === status) : items;
}
function persist(tid, handoffs) { return store.writeJSON(paths.handoffs(tid), { handoffs }).handoffs; }

function create(tid, { contact, reason, transcript = [] } = {}) {
  const handoffs = list(tid);
  const ticket = {
    id: 'ho_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    contact, reason: reason || 'customer_requested_human', status: 'open',
    transcript: (transcript || []).slice(-12), createdAt: new Date().toISOString(),
  };
  handoffs.push(ticket); persist(tid, handoffs);
  try {
    if (adminAlert) {
      const fn = adminAlert.notify || adminAlert.send || adminAlert.alert || adminAlert.raise;
      if (typeof fn === 'function') fn.call(adminAlert, { tenantId: tid, type: 'support_handoff', severity: 'warning', title: 'Human handoff needed', message: 'Customer ' + (contact && contact.phone) + ' needs a human (' + ticket.reason + ')', meta: { ticketId: ticket.id } });
    }
  } catch {}
  return ticket;
}

function resolve(tid, id, note) {
  const handoffs = list(tid);
  const h = handoffs.find((x) => x.id === id);
  if (!h) return null;
  h.status = 'resolved'; h.resolvedAt = new Date().toISOString(); if (note) h.note = note;
  persist(tid, handoffs); return h;
}

module.exports = { create, resolve, list, alertAvailable: () => !!adminAlert };
