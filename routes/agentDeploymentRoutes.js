const express = require('express');
const router = express.Router();

const registry = require('../lib/agentDeployment/agentRegistry');
const deployments = require('../lib/agentDeployment/deploymentRules');
const actionDrafts = require('../lib/agentDeployment/actionDrafts');
const safetyGuard = require('../lib/agentDeployment/safetyGuard');
const channelTargets = require('../lib/agentDeployment/channelTargets');
const flowNodes = require('../lib/agentDeployment/flowNodes');
const store = require('../lib/agentDeployment/store');

const ok = (res, data) => res.json(Object.assign({ ok: true }, data));
const bad = (res, code, errors) => res.status(code).json({ ok: false, errors });

// ---- status ----
router.get('/status', (req, res) => {
  const agents = registry.list();
  const deps = deployments.list();
  ok(res, {
      enabled: String(process.env.AGENT_DEPLOYMENT_ENABLED || 'true') === 'true',
      dryRun: safetyGuard.globalDryRun(),
      requireApproval: safetyGuard.globalRequireApproval(),
      counts: {
       agents: agents.length,
       deployments: deps.length,
       activeDeployments: deps.filter((d) => d.enabled).length,
       approvalPending: deps.filter((d) => d.approvalRequired).length,
      },
      targets: channelTargets.describe(),
    liveActionsDisabled: channelTargets.describe().filter((t) => t.liveFlag && !t.liveAllowed).length,
  });
});


// ---- agents ----
router.get('/agents', (req, res) => ok(res, { agents: registry.list() }));
router.post('/agents', (req, res) => ok(res, { agent: registry.create(req.body || {}) }));
router.get('/agents/:id', (req, res) => {
  const a = registry.get(req.params.id);
  return a ? ok(res, { agent: a }) : bad(res, 404, ['not_found']);
});
router.put('/agents/:id', (req, res) => {

 const a = registry.update(req.params.id, req.body || {});
 return a ? ok(res, { agent: a }) : bad(res, 404, ['not_found']);
});
router.delete('/agents/:id', (req, res) => {
 return registry.remove(req.params.id) ? ok(res, {}) : bad(res, 404, ['not_found']);
});


// ---- deployments ----
router.get('/deployments', (req, res) => ok(res, { deployments: deployments.list() }));
router.post('/deployments', (req, res) => {
 const r = deployments.create(req.body || {});
 return r.ok ? ok(res, { deployment: r.deployment }) : bad(res, 400, r.errors);
});
router.get('/deployments/:id', (req, res) => {
 const d = deployments.get(req.params.id);
 return d ? ok(res, { deployment: d }) : bad(res, 404, ['not_found']);
});
router.put('/deployments/:id', (req, res) => {
 const r = deployments.update(req.params.id, req.body || {});
 return r.ok ? ok(res, { deployment: r.deployment }) : bad(res, 400, r.errors);
});
router.delete('/deployments/:id', (req, res) => {
 return deployments.remove(req.params.id) ? ok(res, {}) : bad(res, 404, ['not_found']);
});
router.post('/deployments/:id/enable', (req, res) => {
 const r = deployments.setEnabled(req.params.id, true);
 return r.ok ? ok(res, { deployment: r.deployment }) : bad(res, 404, r.errors);
});
router.post('/deployments/:id/disable', (req, res) => {
 const r = deployments.setEnabled(req.params.id, false);
 return r.ok ? ok(res, { deployment: r.deployment }) : bad(res, 404, r.errors);
});
// TEST is always dry-run: builds a sample draft, never sends.
router.post('/deployments/:id/test', (req, res) => {
 const d = deployments.get(req.params.id);
 if (!d) return bad(res, 404, ['not_found']);
 const draft = actionDrafts.build({
     agentId: d.agentId, actionType: (req.body && req.body.actionType) || 'suggest_reply',
     targetType: d.targetType, target: d.targetId, approved: false,
   input: { text: (req.body && req.body.sample) || 'test input' },
 });
 ok(res, { dryRun: true, draft });
});


// ---- actions / safety ----
router.post('/actions/draft', (req, res) => {
 const draft = actionDrafts.build(Object.assign({}, req.body, { approved: false }));
 ok(res, { draft });
});
router.post('/safety/check', (req, res) => {
 const b = req.body || {};
 const agent = registry.get(b.agentId) || registry.defaults({ id: b.agentId || 'ephemeral' });
 const result = safetyGuard.check({ agent, action: b.action, targetType: b.targetType, approved: b.approved === true });
 ok(res, { result, explanation: explain(result) });
});

// ---- flow nodes / history / audit ----

router.get('/flow-nodes', (req, res) => ok(res, flowNodes.getRegistry()));
router.get('/history', (req, res) => ok(res, { history: store.readHistory(Number(req.query.limit) || 200) }));
router.get('/audit', (req, res) => ok(res, { audit: store.readAudit(Number(req.query.limit) || 200) }));


function explain(r) {
   if (r.blocked) return 'Blocked: ' + r.blockedReasons.join(', ');
   if (r.allowLive) return 'Live execution permitted (all gates passed + approved).';
   return 'Draft only. Live disabled by default; ' + (r.warnings.join(', ') || 'no warnings') + '.';
}

module.exports = router;
