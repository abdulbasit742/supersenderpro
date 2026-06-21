'use strict';
/** Conversation shape + enums for Shared Inbox 2.0. Masks phone/email. */
const store = require('./store');
const STATUSES = ['open', 'pending', 'resolved', 'waiting_customer', 'waiting_team', 'archived'];
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];
function newId() { return 'conv_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function normalize(input) {
  const i = input || {};
  const now = new Date().toISOString();
  return {
    id: i.id || newId(),
    customerId: i.customerId || null,
    customerNameSafe: i.customerNameSafe || (i.customerName ? (String(i.customerName)[0] + '***') : ''),
    phoneMasked: store.maskPhone(i.phone || i.phoneMasked || ''),
    channel: i.channel || 'whatsapp',
    status: STATUSES.includes(i.status) ? i.status : 'open',
    priority: PRIORITIES.includes(i.priority) ? i.priority : 'normal',
    assignedTo: i.assignedTo || null,
    lastMessagePreview: store.maskEmail(store.maskPhone(String(i.lastMessagePreview || '').slice(0, 140))),
    unreadCount: Number(i.unreadCount) || 0,
    slaDueAt: i.slaDueAt || null,
    tags: i.tags || [],
    createdAt: i.createdAt || now,
    updatedAt: now,
  };
}
module.exports = { STATUSES, PRIORITIES, newId, normalize };
