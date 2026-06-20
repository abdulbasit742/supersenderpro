'use strict';
// CLI for the Agent Sandbox Runtime (no HTTP needed).
//   node agent-runtime/cli.js <command> [args]
const runtime = require('./index');

function out(o) { console.log(typeof o === 'string' ? o : JSON.stringify(o, null, 2)); }

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  switch (cmd) {
    case 'status':  return out(runtime.getStatus());
    case 'tools':   return out(runtime.listTools());
    case 'agents':  return out(runtime.listAgents());
    case 'metrics':
      return rest[0] === '--prometheus' ? out(runtime.metrics.prometheus()) : out(runtime.metrics.json());
    case 'queue':   return out({ stats: runtime.queue.stats(), tasks: runtime.queue.list({ limit: 50 }) });
    case 'runs':    return out({ stats: runtime.runs.stats(), runs: runtime.runs.list({ limit: 20 }) });
    case 'approve': return out(await runtime.approveAndRun(rest[0], 'cli'));
    case 'reject':  return out(runtime.queue.reject(rest[0], 'cli', rest.slice(1).join(' ')));
    case 'explain': {
      const tool = rest[0];
      let args = {}; try { args = JSON.parse(rest[1] || '{}'); } catch {}
      return out(runtime.explain(tool, args, { dryRun: false }));
    }
    case 'plan':    return out(await runtime.plan(rest.join(' '), { agent: process.env.AGENT || 'zeroclaw' }));
    case 'run': {
      const dryRun = !rest.includes('--live');
      const goal = rest.filter(a => a !== '--live').join(' ');
      return out(await runtime.run(goal, { agent: process.env.AGENT || 'zeroclaw', dryRun }));
    }
    default:
      out([
        'Agent Sandbox Runtime CLI',
        'Usage: node agent-runtime/cli.js <command>',
        '',
        '  status                      Show runtime status & policy',
        '  tools | agents              List confined tools / agents',
        '  plan <goal...>              Plan a goal (no execution)',
        '  run <goal...> [--live]      Run a goal (dry-run unless --live)',
        '  queue | runs                Show approval queue / run history',
        '  approve <draftId>           Approve & execute a draft',
        '  reject <draftId> [reason]   Reject a draft',
        '  explain <tool> [argsJSON]   Explain a single action decision',
        '  metrics [--prometheus]      Show metrics',
        '',
        'Env: AGENT=zeroclaw|groq|openai|crewai|langchain|webhook'
      ].join('\n'));
  }
}
main().catch(e => { console.error('error:', e.message); process.exit(1); });
