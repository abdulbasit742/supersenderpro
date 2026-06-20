// lib/voiceAI/approvalWorkflow.js — Thin helpers around the queue for the approval lifecycle.

const queue = require('./voiceQueue');

function requestApproval(input) { return queue.createDraft({ ...input }); }
function approve(id, by) { return queue.approve(id, by); }
function reject(id, by, reason) { return queue.reject(id, by, reason); }
function listPending() { return queue.pending(); }

module.exports = { requestApproval, approve, reject, listPending };
