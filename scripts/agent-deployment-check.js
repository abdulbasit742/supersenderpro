const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const ARTIFACTS = process.env.AGENT_DEPLOYMENT_ARTIFACTS_DIR || path.join(ROOT, 'artifacts');
const STRICT = String(process.env.AGENT_DEPLOYMENT_STRICT || 'false') === 'true';

// isolate store so the check never touches real data
process.env.AGENT_DEPLOYMENT_STORE_PATH = process.env.AGENT_DEPLOYMENT_STORE_PATH || 'data/.ad-check-store.json';
process.env.AGENT_DEPLOYMENT_HISTORY_PATH = process.env.AGENT_DEPLOYMENT_HISTORY_PATH || 'data/.ad-check-history.json';
process.env.AGENT_DEPLOYMENT_AUDIT_PATH = process.env.AGENT_DEPLOYMENT_AUDIT_PATH || 'data/.ad-check-audit.json';


const abs = (p) => path.join(ROOT, p);
const exists = (p) => { try { fs.accessSync(abs(p)); return true; } catch { return false; } };
const read = (p) => { try { return fs.readFileSync(abs(p), 'utf8'); } catch { return ''; } };

const FILES = [
  'lib/agentDeployment/store.js', 'lib/agentDeployment/agentRegistry.js',
     'lib/agentDeployment/deploymentRules.js', 'lib/agentDeployment/channelTargets.js',
     'lib/agentDeployment/safetyGuard.js', 'lib/agentDeployment/actionDrafts.js',
     'lib/agentDeployment/flowNodes.js', 'routes/agentDeploymentRoutes.js',
     'public/agent-deployment.html', 'public/js/agent-deployment.js', 'public/css/agent-deployment.css',
];
const DOCS = [
     'docs/AI_AGENT_DEPLOYMENT_CENTER.md', 'docs/AI_AGENT_DEPLOYMENT_SAFETY.md',
     'docs/AI_AGENT_DEPLOYMENT_FLOW_STUDIO.md', 'docs/AI_AGENT_DEPLOYMENT_TARGETS.md',
];

const results = [];
const add = (check, status, detail) => results.push({ check, status, detail: detail || '' });

function main() {
     // file presence
     FILES.forEach((f) => add('file:' + f, exists(f) ? 'pass' : 'fail', exists(f) ? 'present' : 'missing'));
     DOCS.forEach((f) => add('doc:' + f, exists(f) ? 'pass' : 'warn', exists(f) ? 'present' : 'missing'));

     // wiring
     const server = read('server.js');

   add('wiring:route_mount', /app\.use\(\s*['"]\/api\/agent-deployment['"]/.test(server) ? 'pass' : 'warn', 'mount in server.js');
 const index = read('public/index.html');
   add('wiring:dashboard_link', index.includes('agent-deployment.html') ? 'pass' : 'warn', 'link in index.html');
   const env = read('.env.example');
   add('env:placeholders', /AGENT_DEPLOYMENT_DRY_RUN/.test(env) ? 'pass' : 'warn', 'AGENT_DEPLOYMENT_* in .env.example');
   const pkg = read('package.json');
   add('pkg:check_script', /agent-deployment:check/.test(pkg) ? 'pass' : 'warn');
   add('pkg:smoke_script', /agent-deployment:smoke/.test(pkg) ? 'pass' : 'warn');

   // module load + dry-run probe
   let registry, drafts, guard;
   try {
     registry = require('../lib/agentDeployment/agentRegistry');
     drafts = require('../lib/agentDeployment/actionDrafts');
     guard = require('../lib/agentDeployment/safetyGuard');
     add('load:modules', 'pass', 'core modules loaded');
   } catch (e) { add('load:modules', 'fail', e.message); finish(); return; }


   try {
     const agent = registry.create({ name: 'Check Agent', type: 'support_agent' });
   const draft = drafts.build({ agentId: agent.id, actionType: 'suggest_reply', targetType: 'support_inbox', input: {
text: 'hello +1 5551234567' } });
     add('draft:dry_run', draft.dryRun === true ? 'pass' : 'fail', 'dryRun=' + draft.dryRun);
     add('draft:approval', draft.approvalRequired === true ? 'pass' : 'fail');
     const leak = JSON.stringify(draft).match(/\b\d{10,15}\b/);
     add('draft:no_pii_leak', leak ? 'fail' : 'pass', leak ? 'phone leaked' : 'masked');
     const sg = guard.check({ agent, action: 'create_whatsapp_message_draft', targetType: 'whatsapp_chat', approved: false
});
     add('safety:live_blocked_default', sg.allowLive === false ? 'pass' : 'fail', 'allowLive=' + sg.allowLive);
   } catch (e) { add('draft:run', 'fail', e.message); }

   finish();
}

function finish() {
 const pass = results.filter((r) => r.status === 'pass').length;
   const fail = results.filter((r) => r.status === 'fail').length;
   const warn = results.filter((r) => r.status === 'warn').length;
   const report = { generatedAt: new Date().toISOString(), pass, fail, warn, results };
   try { fs.mkdirSync(ARTIFACTS, { recursive: true }); } catch {}
   fs.writeFileSync(path.join(ARTIFACTS, 'agent_deployment_check.json'), JSON.stringify(report, null, 2));
   fs.writeFileSync(path.join(ARTIFACTS, 'agent_deployment_check.md'), toMd(report));
   console.log(`Agent Deployment check: ${pass} pass, ${fail} fail, ${warn} warn`);
   results.forEach((r) => console.log(` [${r.status.toUpperCase()}] ${r.check} ${r.detail ? '- ' + r.detail : ''}`));
   process.exit(STRICT && fail > 0 ? 1 : 0);
}


function toMd(r) {
 const l = ['# Agent Deployment — Check Report', '', `Generated: ${r.generatedAt}`, `Pass: ${r.pass} · Fail: ${r.fail} · Warn: ${r.warn}`, '', '| Check | Status | Detail |', '| --- | --- | --- |'];
   r.results.forEach((x) => l.push(`| ${x.check} | ${x.status} | ${x.detail} |`));
   return l.join('') + '';
}

main();
