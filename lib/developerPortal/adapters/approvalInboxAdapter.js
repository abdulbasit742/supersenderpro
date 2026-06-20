// developerPortal/adapters/approvalInboxAdapter.js — safe adapter for Approval Inbox.
const { makeAdapter } = require('./_baseAdapter');
module.exports = makeAdapter({ name:'Approval Inbox', detectFiles:['server.js'], events:['approval.item_created', 'approval.item_approved_preview'] });
