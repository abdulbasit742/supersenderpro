'use strict';
const { POLICY } = require('./policy');
const { listTools } = require('./toolRegistry');
const { listAgents, getAgent } = require('./agents');
const sandbox = require('./sandbox');
const queue = require('./approvalQueue');
const audit = require('./auditLog');
const metrics = require('./metrics');
const templates = require('./actionTemplates');
const { sanitize } = require('./contextSanitizer');

function getStatus() {
  return {
    success: true,
    title: 'Agent Sandbox Runtime',
    updatedAt: new Date().toISOString(),
    mode: POLICY.defaultMode,
    policy: {
      dryRunDefault: POLICY.dryRunDefault,
      liveActionsEnabled: POLICY.liveActionsEnabled,
      allowYolo: POLICY.allowYolo,
      maxRiskyPerRun: POLICY.maxRiskyPerRun,
      notifyEnabled: Boolean(POLICY.notifyUrl),
      allowedWorkspaces: POLICY.allowedWorkspaces,
      blockedActions: POLICY.blockedActions,
      approvalRequired: POLICY.approvalRequired
    },
    templates: templates.stats(),
    apiBase: POLICY.apiBase,
    tools: listTools(),
    agents: listAgents(),
    queue: queue.stats(),
    rules: [
      'Supervised + dry-run by default.',
      'Secrets, .env, sessions, payment and customer-private data are stripped before reaching any agent.',
      'High-risk and external actions require explicit human approval.',
      'Filesystem access is confined to allowed workspaces only.'
    ]
  };
}

/** Plan only (no execution). Always safe. */
async function plan(goal, { agent = 'zeroclaw' } = {}) {
  const a = getAgent(agent);
  const steps = await a.plan(goal);
  const annotated = steps.map(s => ({ ...s, evaluation: sandbox.evaluate(s.tool, s.args, { dryRun: false }) }));
  return { success: true, agent, agentName: a.name, goal: sanitize(goal),
    steps: annotated, generatedAt: new Date().toISOString() };
}

/** Plan + run each step through the sandbox (dry-run unless overridden + approved). */
async function run(goal, { agent = 'zeroclaw', dryRun, approved = false } = {}) {
  const a = getAgent(agent);
  const effectiveDryRun = dryRun !== undefined ? dryRun : POLICY.dryRunDefault;
  const steps = await a.plan(goal);
  const transcript = [];
  let riskyCount = 0;
  for (const s of steps) {
    const c = sandbox.classify(s.tool, s.args);
    const isRisky = c.ok && (c.risk === 'high' || c.risk === 'medium');
    // Safety quota: stop attempting risky actions past the per-run limit.
    if (isRisky && !effectiveDryRun) {
      riskyCount += 1;
      if (riskyCount > POLICY.maxRiskyPerRun) {
        transcript.push({ rationale: s.rationale, tool: s.tool, args: s.args,
          status: 'quota_exceeded', reason: `risky-action quota (${POLICY.maxRiskyPerRun}/run) reached` });
        continue;
      }
    }
    const r = await sandbox.execute(s.tool, s.args, { dryRun: effectiveDryRun, approved, agent, goal });
    transcript.push({ rationale: s.rationale, ...r });
  }
  const summary = {
    executed: transcript.filter(t => t.status === 'executed').length,
    dryRun: transcript.filter(t => t.status === 'dry_run').length,
    pendingApproval: transcript.filter(t => t.status === 'pending_approval').length,
    blocked: transcript.filter(t => t.status === 'blocked').length,
    failed: transcript.filter(t => t.status === 'failed').length,
    quotaExceeded: transcript.filter(t => t.status === 'quota_exceeded').length
  };
  const result = { success: true, agent, agentName: a.name, goal: sanitize(goal),
    dryRun: effectiveDryRun, summary, transcript, ranAt: new Date().toISOString() };
  try { result.auditId = audit.record(result).id; } catch { /* noop */ }
  return result;
}

/** Explain (without executing) what the sandbox would do with a single action. */
function explain(tool, args = {}, opts = {}) {
  const c = sandbox.classify(tool, args);
  const ev = sandbox.evaluate(tool, args, opts);
  return { success: true, tool, args, classification: c.ok
    ? { actionType: c.actionType, risk: c.risk, blocked: c.blocked, needsApproval: c.needsApproval, pathViolation: c.pathViolation }
    : { error: c.reason }, decision: ev.decision, reason: ev.reason };
}

module.exports = {
  getStatus, plan, run, explain,
  listTools, listAgents,
  evaluate: sandbox.evaluate,
  approveAndRun: sandbox.executeApproved,
  queue: { list: queue.list, get: queue.get, approve: queue.approve, reject: queue.reject, stats: queue.stats },
  runs: { list: audit.list, get: audit.get, stats: audit.stats },
  templates: { create: templates.create, list: templates.list, get: templates.get, getByName: templates.getByName, deactivate: templates.deactivate, execute: templates.executeTemplate, stats: templates.stats },
  metrics,
  POLICY
};
