   'use strict';
   /**
    * lib/sharedInbox/inboxAdapter.js
    * Bridges to the EXISTING Omnichannel Inbox (src/modules/inbox) when present.
    * Read-only summaries; never rebuilds it. Falls back to the local shared-inbox store
    * so the dashboard still works if the inbox module is absent in this build.
    */
   const path = require('path');
   const store = require('./store');
   function tryRequire(rels) { for (const r of rels) { try { return require(path.resolve(process.cwd(), r)); } catch {} }
   return null; }
   const inboxCore = tryRequire(['src/modules/inbox/inbox', 'src/modules/inbox/inboxStore']);
   const cannedReplies = tryRequire(['src/modules/inbox/cannedReplies']);

   function available() { return !!inboxCore; }

   // list conversations: prefer existing inbox; else local fallback
   function listConversations() {

    if (inboxCore && typeof inboxCore.listConversations === 'function') {
        try { return { source: 'omnichannel_inbox', items: inboxCore.listConversations() || [] }; } catch {}
    }
    const s = store.load();
    return { source: 'shared_inbox_fallback', items: Object.values(s.conversations) };
}
function getConversation(id) {
    if (inboxCore && typeof inboxCore.getConversation === 'function') {
      try { return { source: 'omnichannel_inbox', conversation: inboxCore.getConversation(id) }; } catch {}
    }
    const s = store.load();
    return { source: 'shared_inbox_fallback', conversation: s.conversations[id] || null };
}
// saved/canned replies: reuse existing if present
function listSavedReplies() {
    if (cannedReplies && typeof cannedReplies.list === 'function') {
      try { return { source: 'canned_replies', items: cannedReplies.list() || [] }; } catch {}
    }
    const s = store.load();
    return { source: 'shared_inbox_fallback', items: Object.values(s.savedReplies) };
}
module.exports = { available, listConversations, getConversation, listSavedReplies };
