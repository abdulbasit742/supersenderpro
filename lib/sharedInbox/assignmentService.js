'use strict';
/** Agent assignment overlay (shared-inbox store only; never mutates source inbox). */
const conversationService = require('./conversationService');
function assign(id, agentId) {
  if (!agentId) return { ok: false, errors: ['missing_agent'] };
    return conversationService.setOverlay(id, { assignedTo: String(agentId) });
}
function unassign(id) { return conversationService.setOverlay(id, { assignedTo: null }); }
module.exports = { assign, unassign };
