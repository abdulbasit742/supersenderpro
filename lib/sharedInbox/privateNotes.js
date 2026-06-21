'use strict';
/** Internal notes per conversation. Reuses existing inbox notes if present; else local store. Masked. */
const path = require('path');
const store = require('./store');
function tryRequire(rels) { for (const r of rels) { try { return require(path.resolve(process.cwd(), r)); } catch {} }
return null; }
const inboxCore = tryRequire(['src/modules/inbox/inbox']);
function mask(t) { return store.maskEmail(store.maskPhone(String(t || ''))); }
function list(convId) {
  if (inboxCore && typeof inboxCore.listNotes === 'function') { try { return { source: 'omnichannel_inbox', notes:
inboxCore.listNotes(convId) || [] }; } catch {} }
  const s = store.load(); return { source: 'shared_inbox', notes: (s.notes[convId] || []) };
}
function add(convId, agentId, text) {
  const note = { id: 'note_' + Date.now().toString(36), agentId: String(agentId || 'agent'), text: mask(text), at: new
Date().toISOString(), internal: true };
  if (inboxCore && typeof inboxCore.addNote === 'function') { try { inboxCore.addNote(convId, note); return { ok: true,
source: 'omnichannel_inbox', note }; } catch {} }
    const s = store.load(); (s.notes[convId] = s.notes[convId] || []).push(note); store.save(s);
    return { ok: true, source: 'shared_inbox', note };
}
module.exports = { list, add };
