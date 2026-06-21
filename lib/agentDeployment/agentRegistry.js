const store = require('./store');

const AGENT_TYPES = [
  'sales_agent', 'support_agent', 'payment_agent', 'renewal_agent',
     'ecommerce_agent', 'group_moderation_agent', 'seller_intelligence_agent',
     'buyer_matching_agent', 'marketplace_advisor_agent', 'channel_publisher_agent',
     'social_caption_agent', 'voice_agent', 'complaint_resolution_agent',
     'admin_assistant_agent',
];


function newId(prefix) {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function defaults(partial) {
  const now = new Date().toISOString();
     return {
       id: partial.id || newId('agent'),
       name: partial.name || 'Untitled Agent',
       type: AGENT_TYPES.includes(partial.type) ? partial.type : 'support_agent',
       description: partial.description || '',
       enabled: false,
       dryRun: true,
       approvalRequired: true,
       allowedTargets: partial.allowedTargets || [],
       blockedTargets: partial.blockedTargets || [],
       allowedActions: partial.allowedActions || ['suggest_reply', 'summarize_conversation'],
       blockedActions: partial.blockedActions || [],
       modelProviderPreference: partial.modelProviderPreference || 'auto',
       languagePreference: partial.languagePreference || 'auto',
       tone: partial.tone || 'professional',
       maxActionsPerHour: clampRate(partial.maxActionsPerHour),
       escalationRules: partial.escalationRules || [],
       createdAt: now,
       updatedAt: now,
     };
}

function clampRate(v) {
  const max = parseInt(process.env.AGENT_DEPLOYMENT_MAX_ACTIONS_PER_HOUR || '20', 10);
     const n = parseInt(v, 10);
     if (!Number.isFinite(n) || n < 0) return Math.min(20, max);

   return Math.min(n, max);
}

function list() { return Object.values(store.load().agents); }
function get(id) { return store.load().agents[id] || null; }

function create(input) {
   const state = store.load();
   // enforce safe flags regardless of input
   const agent = defaults(input || {});
   agent.dryRun = true; agent.approvalRequired = true; agent.enabled = !!input.enabled && false;
   state.agents[agent.id] = agent;
   store.save(state);
   store.appendAudit({ kind: 'agent_created', agentId: agent.id, type: agent.type });
   return agent;
}

function update(id, patch) {
 const state = store.load();
   const cur = state.agents[id];
   if (!cur) return null;
   const next = Object.assign({}, cur, patch, {
     id: cur.id,
       createdAt: cur.createdAt,
       updatedAt: new Date().toISOString(),
     maxActionsPerHour: clampRate(patch.maxActionsPerHour != null ? patch.maxActionsPerHour : cur.maxActionsPerHour),
   });
   // never let an update silently disable dry-run/approval; that requires safetyGuard + env
   if (next.dryRun !== true && process.env.AGENT_DEPLOYMENT_DRY_RUN !== 'false') next.dryRun = true;
   state.agents[id] = next;
   store.save(state);
   store.appendAudit({ kind: 'agent_updated', agentId: id });
   return next;
}

function remove(id) {
 const state = store.load();
   if (!state.agents[id]) return false;
   delete state.agents[id];
   // cascade: drop deployments for this agent
   for (const dId of Object.keys(state.deployments)) {
       if (state.deployments[dId].agentId === id) delete state.deployments[dId];
   }
   store.save(state);
   store.appendAudit({ kind: 'agent_deleted', agentId: id });
   return true;
}


module.exports = { AGENT_TYPES, list, get, create, update, remove, newId, defaults };
