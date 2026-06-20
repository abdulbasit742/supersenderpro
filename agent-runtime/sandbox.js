'use strict';
// The enforcement core. Every agent action passes through evaluate()/execute().
const path = require('path');
const { POLICY, isPathAllowed } = require('./policy');
const { getTool } = require('./toolRegistry');
const queue = require('./approvalQueue');

function classify(toolName, args = {}) {
  const tool = getTool(toolName);
  if (!tool) return { ok: false, reason: `unknown tool: ${toolName}` };
  const actionType = tool.actionType;
  const blocked = POLICY.blockedActions.includes(actionType) || POLICY.blockedActions.includes(toolName);
  const needsApproval = POLICY.approvalRequired.includes(actionType) || tool.risk === 'high' || tool.risk === 'medium';
  // path confinement check for fs tools
  let pathViolation = false;
  if (args && (args.file || args.path)) {
    const target = path.resolve(POLICY.dataDir, path.basename(String(args.file || args.path)));
    pathViolation = !isPathAllowed(target);
  }
  return { ok: true, tool, actionType, blocked, needsApproval, pathViolation, risk: tool.risk };
}

/**
 * Decide what happens to an action WITHOUT executing it.
 * decision: 'blocked' | 'needs_approval' | 'dry_run' | 'allow'
 */
function evaluate(toolName, args = {}, opts = {}) {
  const c = classify(toolName, args);
  if (!c.ok) return { decision: 'error', reason: c.reason };
  if (c.pathViolation) return { decision: 'blocked', reason: 'path outside allowed workspace', actionType: c.actionType };
  if (c.blocked && !POLICY.allowYolo) return { decision: 'blocked', reason: `action '${c.actionType}' is blocked by policy`, actionType: c.actionType };

  const dryRun = opts.dryRun !== undefined ? opts.dryRun : POLICY.dryRunDefault;
  if (dryRun) return { decision: 'dry_run', reason: 'dry-run mode: simulated only', actionType: c.actionType, risk: c.risk };

  if (c.needsApproval && !opts.approved && !POLICY.allowYolo) {
    return { decision: 'needs_approval', reason: 'requires human approval', actionType: c.actionType, risk: c.risk };
  }
  if ((c.risk === 'high') && !POLICY.liveActionsEnabled && !opts.approved) {
    return { decision: 'needs_approval', reason: 'live high-risk actions disabled', actionType: c.actionType, risk: c.risk };
  }
  return { decision: 'allow', reason: 'permitted', actionType: c.actionType, risk: c.risk };
}

/**
 * Execute (or safely refuse) an action through the sandbox.
 * Returns a normalized record; enqueues drafts for anything needing approval.
 */
async function execute(toolName, args = {}, opts = {}) {
  const ev = evaluate(toolName, args, opts);
  const base = { tool: toolName, args, actionType: ev.actionType, decision: ev.decision, reason: ev.reason };

  if (ev.decision === 'error')   return { ...base, status: 'error' };
  if (ev.decision === 'blocked') {
    queue.enqueue({ agent: opts.agent, goal: opts.goal, status: 'blocked',
      action: { tool: toolName, actionType: ev.actionType, args, risk: ev.risk }, reason: ev.reason, dryRun: false });
    return { ...base, status: 'blocked' };
  }
  if (ev.decision === 'dry_run') {
    return { ...base, status: 'dry_run', simulated: true,
      preview: `Would call ${toolName}(${JSON.stringify(args)})` };
  }
  if (ev.decision === 'needs_approval') {
    const draft = queue.enqueue({ agent: opts.agent, goal: opts.goal, status: 'pending_approval',
      action: { tool: toolName, actionType: ev.actionType, args, risk: ev.risk }, reason: ev.reason, dryRun: false });
    // Fire-and-forget notification (never blocks the run).
    try { require('./notify').notifyApprovalNeeded(draft); } catch { /* noop */ }
    return { ...base, status: 'pending_approval', draftId: draft.id };
  }
  // allow -> actually run
  const tool = getTool(toolName);
  try {
    const result = await tool.run(args, { api: require('./toolRegistry').api });
    return { ...base, status: 'executed', result };
  } catch (err) {
    return { ...base, status: 'failed', error: err.message };
  }
}

/** Approve a queued draft and execute it now. */
async function executeApproved(draftId, by = 'admin') {
  const draft = queue.get(draftId);
  if (!draft) return { status: 'error', error: 'draft not found' };
  if (draft.status !== 'pending_approval' && draft.status !== 'approved')
    return { status: 'error', error: `draft is '${draft.status}', not approvable` };
  queue.approve(draftId, by);
  const { tool, args } = draft.action;
  const res = await execute(tool, args, { approved: true, dryRun: false, agent: draft.agent, goal: draft.goal });
  if (res.status === 'executed') queue.markExecuted(draftId, res.result);
  else if (res.status === 'failed') queue.markFailed(draftId, res.error);
  return res;
}

module.exports = { evaluate, execute, executeApproved, classify };
