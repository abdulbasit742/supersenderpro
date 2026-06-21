 'use strict';
 /**
     * handoffQueue.js — preview-only human-handoff queue. Records that a handoff
     * WOULD occur; never performs a live handoff or notification. In-memory + store.
  */
 const store = require('./store');


 const QUEUE = []; // in-memory preview queue

 function enqueuePreview(reply, reason) {

  const item = {
   conversationId: reply.conversationId,
   replyId: reply.id,
   reason: reason || 'high_risk',
   riskLevel: reply.riskLevel,
   assignedQueue: 'human_support',
   phoneMasked: reply.phoneMasked,
   enqueuedAt: new Date().toISOString(),
   liveHandoff: false,
  };
  QUEUE.unshift(item);
  return item;
}

function list(limit) { return QUEUE.slice(0, limit || 50); }


function seedFromStore() {
  // Build a preview queue from any stored replies flagged for handoff.
  store.all().filter((r) => r.handoffRequired).forEach((r) => {
  if (!QUEUE.find((q) => q.replyId === r.id)) enqueuePreview(r, r.riskLevel === 'critical' ? 'critical_risk' :
'flagged');
  });
  return QUEUE;
}


module.exports = { enqueuePreview, list, seedFromStore, QUEUE };
