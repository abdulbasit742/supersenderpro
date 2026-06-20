'use strict';
// Prometheus-style text metrics from the queue + audit log.
const queue = require('./approvalQueue');
const audit = require('./auditLog');

function prometheus() {
  const q = queue.stats();
  const a = audit.stats();
  const lines = [];
  const g = (name, help, value, labels = '') => {
    lines.push(`# HELP ${name} ${help}`);
    lines.push(`# TYPE ${name} gauge`);
    lines.push(`${name}${labels} ${value}`);
  };
  g('agent_runtime_queue_total', 'Total approval-queue entries', q.total);
  g('agent_runtime_queue_pending', 'Drafts awaiting approval', q.pending_approval);
  g('agent_runtime_queue_executed', 'Executed approved drafts', q.executed);
  g('agent_runtime_queue_rejected', 'Rejected drafts', q.rejected);
  g('agent_runtime_queue_blocked', 'Blocked actions', q.blocked);
  g('agent_runtime_runs_total', 'Total agent runs', a.totalRuns);
  g('agent_runtime_runs_dry', 'Dry-run agent runs', a.dryRuns);
  g('agent_runtime_runs_live', 'Live agent runs', a.liveRuns);
  g('agent_runtime_steps_total', 'Total planned steps', a.steps);
  g('agent_runtime_steps_failed', 'Failed steps', a.failed);
  for (const [agent, n] of Object.entries(a.byAgent || {})) {
    g('agent_runtime_runs_by_agent', 'Runs per agent', n, `{agent="${agent}"}`);
  }
  return lines.join('\n') + '\n';
}

function json() { return { queue: queue.stats(), audit: audit.stats() }; }

module.exports = { prometheus, json };
