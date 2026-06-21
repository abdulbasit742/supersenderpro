   'use strict';
   /**
    * lib/sharedInbox/conversationService.js
    * Lists/gets conversations (via inboxAdapter), and applies the ADD-ON overlays:
    * status, priority, assignment, SLA. Overlays live in the shared-inbox store and
    * are merged onto whatever the existing inbox returns, so we never mutate the inbox.
    */
   const store = require('./store');
   const model = require('./conversationModel');
   const adapter = require('./inboxAdapter');
   const sla = require('./slaService');

   function overlay(conv) {

    if (!conv || !conv.id) return conv;
    const s = store.load();
    const ov = s.conversations[conv.id] || {};
    const merged = Object.assign({}, conv, {
      status: ov.status || conv.status || 'open',
     priority: ov.priority || conv.priority || 'normal',
     assignedTo: ov.assignedTo !== undefined ? ov.assignedTo : (conv.assignedTo || null),
      slaDueAt: ov.slaDueAt || conv.slaDueAt || null,
    });
    merged.sla = sla.evaluate(merged);
    return merged;
}

function list() {
  const r = adapter.listConversations();
  return { ok: true, source: r.source, dryRun: true, conversations: (r.items || []).map((c) =>
overlay(model.normalize(c))) };
}
function get(id) {
    const r = adapter.getConversation(id);
    if (!r.conversation) return { ok: false, errors: ['not_found'] };
    return { ok: true, source: r.source, dryRun: true, conversation: overlay(model.normalize(r.conversation)) };
}
// overlay setters (write only to shared-inbox store, never the source inbox)
function setOverlay(id, patch) {
    const s = store.load();
    const cur = s.conversations[id] || { id };
    s.conversations[id] = Object.assign({}, cur, patch, { id, updatedAt: new Date().toISOString() });
    store.save(s);
    return { ok: true, conversation: s.conversations[id] };
}
function setStatus(id, status) { return model.STATUSES.includes(status) ? setOverlay(id, { status }) : { ok: false,
errors: ['invalid_status'] }; }
function setPriority(id, priority) {
  if (!model.PRIORITIES.includes(priority)) return { ok: false, errors: ['invalid_priority'] };
    const r = setOverlay(id, { priority });
    // recompute SLA due based on new priority
    const due = sla.dueFor(priority);
    return setOverlay(id, { priority, slaDueAt: due });
}
module.exports = { list, get, setOverlay, setStatus, setPriority };
