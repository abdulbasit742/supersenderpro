 'use strict';


 /**
     * inbox.js
     * Core inbox operations: ingest inbound, send outbound replies, assign agents,
     * change status, add internal notes. Outbound sending is delegated to per-channel
     * senders bound at boot via bindSender(channel, fn).
     */

 const inboxStore = require('./inboxStore');
 const canned = require('./cannedReplies');


 const senders = new Map();

 function bindSender(channel, fn) {
      senders.set(channel, fn);
      return true;
 }

 /**
  * Ingest an inbound message. Creates/updates the conversation and appends it.
     * payload: { channel, from, name, text }
     */
 function ingest(payload) {
   const p = payload || {};
      if (!inboxStore.CHANNELS.includes(p.channel)) {
        return { ok: false, error: 'unknown channel: ' + p.channel };
      }
      if (!p.from) return { ok: false, error: 'from is required' };
      const { conv, all } = inboxStore.findOrCreate(p.channel, p.from, p.name);
      const msg = inboxStore.addMessage(conv, 'in', p.text, p.from);
      // reopen if a closed conversation gets a new message
      if (conv.status === 'closed') conv.status = 'open';
      inboxStore.save(all);
      return { ok: true, conversationId: conv.id, message: msg };
 }

 /**
  * Send an outbound reply in a conversation. Expands '/shortcut' canned replies.
     * Routes through the bound sender for the conversation's channel.
     */
 async function reply(conversationId, text, agent) {
   const conv = inboxStore.get(conversationId);
      if (!conv) return { ok: false, error: 'conversation not found' };

      const expanded = canned.expand(text, { name: conv.name, channel: conv.channel });
      const finalText = expanded != null ? expanded : text;

      const sender = senders.get(conv.channel);

    let delivery = { ok: false, error: 'no sender bound for ' + conv.channel };
    if (typeof sender === 'function') {
      try {
            await sender(conv.contactId, finalText);
            delivery = { ok: true };
        } catch (err) {
          delivery = { ok: false, error: String(err && err.message ? err.message : err) };
        }
    }

    const all = inboxStore.list();
    const fresh = all.find((c) => c.id === conversationId);
    const msg = inboxStore.addMessage(fresh, 'out', finalText, agent || 'agent');
    fresh.unread = 0;
    if (fresh.status === 'open') fresh.status = 'pending';
    inboxStore.save(all);

    return { ok: delivery.ok, message: msg, delivery };
}


function addNote(conversationId, text, agent) {
    const all = inboxStore.list();
    const conv = all.find((c) => c.id === conversationId);
    if (!conv) return { ok: false, error: 'conversation not found' };
    const msg = inboxStore.addMessage(conv, 'note', text, agent || 'agent');
    inboxStore.save(all);
    return { ok: true, message: msg };
}


function assign(conversationId, assignee) {
  return inboxStore.update(conversationId, { assignee: assignee || null });
}


function setStatus(conversationId, status) {
  if (!inboxStore.STATUSES.includes(status)) return { ok: false, error: 'invalid status' };
    return inboxStore.update(conversationId, { status });
}


function markRead(conversationId) {
    return inboxStore.markRead(conversationId);
}

module.exports = { bindSender, ingest, reply, addNote, assign, setStatus, markRead };
