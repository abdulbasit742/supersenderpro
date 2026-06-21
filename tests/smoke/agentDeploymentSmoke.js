const fs = require('fs');
const path = require('path');


const ROOT = process.cwd();
const ARTIFACTS = process.env.AGENT_DEPLOYMENT_ARTIFACTS_DIR || path.join(ROOT, 'artifacts');
const STRICT = String(process.env.AGENT_DEPLOYMENT_STRICT || 'false') === 'true';

process.env.AGENT_DEPLOYMENT_STORE_PATH = 'data/.ad-smoke-store.json';
process.env.AGENT_DEPLOYMENT_HISTORY_PATH = 'data/.ad-smoke-history.json';
process.env.AGENT_DEPLOYMENT_AUDIT_PATH = 'data/.ad-smoke-audit.json';

const results = [];
const t = (name, cond, detail) => {
     const status = cond ? 'pass' : 'fail';
     results.push({ name, status, detail: detail || '' });
     console.log(`   [${status.toUpperCase()}] ${name}${detail ? ' - ' + detail : ''}`);
};

function run() {
     console.log('Agent Deployment smoke tests');
     let registry, deployments, drafts, guard, flowNodes, store;
     try {
       store = require('../../lib/agentDeployment/store');
      registry = require('../../lib/agentDeployment/agentRegistry');
      deployments = require('../../lib/agentDeployment/deploymentRules');
      drafts = require('../../lib/agentDeployment/actionDrafts');
      guard = require('../../lib/agentDeployment/safetyGuard');
      flowNodes = require('../../lib/agentDeployment/flowNodes');
      t('require modules', true);
     } catch (e) { t('require modules', false, e.message); return finish(); }

     // reset isolated store
     try { store.save(store.emptyState()); } catch {}

     // create agent

   let agent;
   try { agent = registry.create({ name: 'Smoke Sales', type: 'sales_agent' }); t('create agent', !!agent && !!agent.id);
}
   catch (e) { t('create agent', false, e.message); }

   t('agent dryRun default true', agent && agent.dryRun === true);
   t('agent approvalRequired default true', agent && agent.approvalRequired === true);
   t('agent enabled default false', agent && agent.enabled === false);

   // create deployment
   let dep;
 try { const r = deployments.create({ agentId: agent.id, targetType: 'whatsapp_chat', mode: 'suggest_only' }); dep =
r.deployment; t('create deployment', r.ok === true); }
   catch (e) { t('create deployment', false, e.message); }


   t('deployment mode suggest_only', dep && dep.mode === 'suggest_only');
   t('deployment dryRun true', dep && dep.dryRun === true);

   // draft action with PII in input
   let draft;
   try { draft = drafts.build({ agentId: agent.id, actionType: 'create_whatsapp_message_draft', targetType:
'whatsapp_chat', target: '+1 555 0101 2345', input: { text: 'call me at +1 5550101 2345 or a@b.com' } }); t('build draft', !!draft); }
   catch (e) { t('build draft', false, e.message); }

   t('draft dryRun true', draft && draft.dryRun === true);
   t('draft approvalRequired true', draft && draft.approvalRequired === true);

   const blob = JSON.stringify(draft || {});
   t('no full phone leak', !/\b\d{10,15}\b/.test(blob), 'masked');
   t('no email leak', !/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(blob), 'masked');

   // live blocked by default
 const sg = guard.check({ agent, action: 'create_whatsapp_message_draft', targetType: 'whatsapp_chat', approved: false
});
   t('live action blocked by default', sg.allowLive === false, 'allowLive=' + sg.allowLive);


   // flow nodes
   const reg = flowNodes.getRegistry();
   t('flow triggers exist', Array.isArray(reg.triggers) && reg.triggers.length > 0, reg.triggers.length + ' triggers');
   t('flow actions exist', Array.isArray(reg.actions) && reg.actions.length > 0, reg.actions.length + ' actions');

   finish();
}

function finish() {
 const pass = results.filter((r) => r.status === 'pass').length;
   const fail = results.filter((r) => r.status === 'fail').length;
   const report = { generatedAt: new Date().toISOString(), pass, fail, results };
   try { fs.mkdirSync(ARTIFACTS, { recursive: true }); } catch {}
   fs.writeFileSync(path.join(ARTIFACTS, 'agent_deployment_smoke.json'), JSON.stringify(report, null, 2));
   fs.writeFileSync(path.join(ARTIFACTS, 'agent_deployment_smoke.md'), '# Agent Deployment — Smoke Pass: ' + pass + ' · Fail: ' + fail + '' + results.map((r) => `- [${r.status}] ${r.name} ${r.detail}`).join('') + '');
   console.log(`Result: ${pass} pass, ${fail} fail`);
   // cleanup isolated store files
 ['data/.ad-smoke-store.json','data/.ad-smoke-history.json','data/.ad-smoke-audit.json'].forEach((f) => { try {
fs.unlinkSync(path.join(ROOT, f)); } catch {} });
   process.exit(STRICT && fail > 0 ? 1 : 0);
}


run();
