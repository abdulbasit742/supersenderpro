'use strict';
// Fire-and-forget notification when an action needs human approval.
const { POLICY } = require('./policy');

async function notifyApprovalNeeded(draft) {
  const url = POLICY.notifyUrl;
  if (!url) return false;
  const payload = {
    type: 'agent_runtime.approval_needed',
    at: new Date().toISOString(),
    draftId: draft.id,
    agent: draft.agent,
    goal: draft.goal,
    tool: draft.action && draft.action.tool,
    actionType: draft.action && draft.action.actionType,
    risk: draft.action && draft.action.risk
  };
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json',
        ...(POLICY.notifyKey ? { authorization: `Bearer ${POLICY.notifyKey}` } : {}) },
      body: JSON.stringify(payload)
    });
    return true;
  } catch {
    return false; // never let a notification failure break the run
  }
}

module.exports = { notifyApprovalNeeded };
