 'use strict';


 /**
     * inboxStore.js
     * Conversations + messages over /data/conversations.json.
     * A conversation is keyed by channel + contact, and holds an ordered
     * message list plus routing metadata (status, assignee, tags, unread).
     *
     * Conversation: {
     *     id, channel, contactId, name, status, assignee, tags[], unread,
     *     lastMessageAt, createdAt, messages: [{ id, dir, text, at, author }]
     * }
     * dir: 'in' | 'out' | 'note'
     */

 const store = require('../../lib/jsonStore');


 const FILE = 'conversations';
 const CHANNELS = ['whatsapp', 'instagram', 'facebook', 'telegram'];
 const STATUSES = ['open', 'pending', 'closed'];

 function nowIso() {
   return new Date().toISOString();
 }
 function genId(prefix) {
         return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
 }


 function list() {
         return store.read(FILE, []) || [];
 }

 function save(all) {
         store.write(FILE, all);
         return all;
 }

 function convKey(channel, contactId) {
   return channel + ':' + contactId;
 }


 function get(id) {
   return list().find((c) => c.id === id) || null;
 }

 function findByContact(channel, contactId) {
   return list().find((c) => c.channel === channel && c.contactId === String(contactId)) || null;
 }

function findOrCreate(channel, contactId, name) {
    const all = list();
    let conv = all.find((c) => c.channel === channel && c.contactId === String(contactId));
    if (conv) return { conv, all, created: false };
    conv = {
      id: genId('conv'),
      channel,
      contactId: String(contactId),
      name: name || String(contactId),
      status: 'open',
      assignee: null,
      tags: [],
      unread: 0,
      lastMessageAt: nowIso(),
      createdAt: nowIso(),
      messages: [],
    };
    all.push(conv);
    return { conv, all, created: true };
}

function addMessage(conv, dir, text, author) {
  const msg = { id: genId('msg'), dir, text: String(text == null ? '' : text), at: nowIso(), author: author || null };
    conv.messages.push(msg);
    conv.lastMessageAt = msg.at;
    if (dir === 'in') conv.unread = (conv.unread || 0) + 1;
    return msg;
}


function update(id, patch) {
  const all = list();
    const idx = all.findIndex((c) => c.id === id);
    if (idx === -1) return { ok: false, error: 'conversation not found' };
    all[idx] = Object.assign({}, all[idx], patch);
    save(all);
    return { ok: true, conversation: all[idx] };
}


function markRead(id) {
    return update(id, { unread: 0 });
}

function summary() {
    const all = list();
    return {
      total: all.length,
      open: all.filter((c) => c.status === 'open').length,
      pending: all.filter((c) => c.status === 'pending').length,
      closed: all.filter((c) => c.status === 'closed').length,
      unread: all.reduce((a, c) => a + (c.unread || 0), 0),
      byChannel: CHANNELS.reduce((acc, ch) => {
         acc[ch] = all.filter((c) => c.channel === ch).length;
         return acc;
      }, {}),
    };
}

module.exports = {
     FILE, CHANNELS, STATUSES,
     list, save, get, findByContact, findOrCreate, addMessage, update, markRead, summary, convKey,
};
