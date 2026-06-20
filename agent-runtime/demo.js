'use strict';
// End-to-end demo: runs an agent goal through the sandbox in dry-run.
//   node agent-runtime/demo.js "follow up cold leads and send a reminder"
const runtime = require('./index');

(async () => {
  const goal = process.argv.slice(2).join(' ') || 'Give me a sales overview and follow up cold leads';
  console.log('=== Agent Sandbox Runtime — DEMO ===');
  console.log('Goal:', goal, '\n');

  const status = runtime.getStatus();
  console.log(`Mode: ${status.mode} | dryRunDefault: ${status.policy.dryRunDefault} | liveActions: ${status.policy.liveActionsEnabled}`);
  console.log(`Tools available to agent: ${status.tools.length} | Agents: ${status.agents.map(a => a.id).join(', ')}\n`);

  const planned = await runtime.plan(goal, { agent: 'zeroclaw' });
  console.log('--- PLAN ---');
  planned.steps.forEach((s, i) =>
    console.log(`${i + 1}. ${s.tool}  [${s.evaluation.decision}]  - ${s.rationale}`));

  const res = await runtime.run(goal, { agent: 'zeroclaw', dryRun: true });
  console.log('\n--- DRY-RUN TRANSCRIPT ---');
  res.transcript.forEach((t, i) =>
    console.log(`${i + 1}. ${t.tool} -> ${t.status}${t.draftId ? ' (draft ' + t.draftId.slice(0, 8) + ')' : ''}`));
  console.log('\nSummary:', JSON.stringify(res.summary));
  console.log('\nNothing was actually executed (dry-run). Risky steps are queued for approval.');
})();
