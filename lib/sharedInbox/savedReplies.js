   'use strict';
   /** Saved replies. Reuses existing canned replies via adapter; local add for new ones. */
   const store = require('./store');
   const adapter = require('./inboxAdapter');
   function list() { const r = adapter.listSavedReplies(); return { ok: true, source: r.source, replies: r.items }; }

function add(input) {
     const i = input || {};
     if (!i.title || !i.body) return { ok: false, errors: ['title_and_body_required'] };
     const s = store.load();
     const id = 'sr_' + Date.now().toString(36);
  s.savedReplies[id] = { id, title: String(i.title).slice(0, 120), body:
store.maskEmail(store.maskPhone(String(i.body).slice(0, 2000))), tags: i.tags || [], createdAt: new Date().toISOString()
};
     store.save(s);
     return { ok: true, reply: s.savedReplies[id] };
}
module.exports = { list, add };
