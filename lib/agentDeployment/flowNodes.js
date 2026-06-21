const actionDrafts = require('./actionDrafts');
const deploymentRules = require('./deploymentRules');
const registry = require('./agentRegistry');
const store = require('./store');

const TRIGGERS = [
     { id: 'agent.deployed', label: 'Agent deployed to target' },
     { id: 'agent.disabled', label: 'Agent disabled' },
     { id: 'agent.action_suggested', label: 'Agent suggested an action' },
     { id: 'agent.approval_needed', label: 'Agent action needs approval' },
     { id: 'agent.escalation_needed', label: 'Agent escalation needed' },
     { id: 'agent.rate_limit_hit', label: 'Agent hit rate limit' },
     { id: 'agent.safety_blocked', label: 'Agent action safety-blocked' },
     { id: 'agent.reply_drafted', label: 'Agent reply drafted' },
     { id: 'agent.voice_draft_created', label: 'Agent voice draft created' },
     { id: 'agent.channel_post_drafted', label: 'Agent channel post drafted' },
     { id: 'agent.marketplace_opportunity_found', label: 'Marketplace opportunity found' },
];


// Each action handler is dry-run by default and returns a standard draft/result.
const ACTIONS = [
  {
      id: 'deploy_agent_to_target',
      label: 'Deploy agent to target',
    run: (cfg) => deploymentRules.create({ agentId: cfg.agentId, targetType: cfg.targetType, targetId: cfg.targetId,
mode: 'suggest_only' }),
     },
     { id: 'disable_agent', label: 'Disable agent', run: (cfg) => registry.update(cfg.agentId, { enabled: false }) },
  { id: 'create_agent_reply_draft', label: 'Create agent reply draft', run: (cfg) => actionDrafts.build({ agentId:
cfg.agentId, actionType: 'suggest_reply', targetType: cfg.targetType, input: cfg }) },
  { id: 'create_agent_channel_post_draft', label: 'Create channel post draft', run: (cfg) => actionDrafts.build({
agentId: cfg.agentId, actionType: 'create_channel_post_draft', targetType: 'whatsapp_channel', input: cfg }) },
  { id: 'create_agent_social_post_draft', label: 'Create social post draft', run: (cfg) => actionDrafts.build({ agentId:
cfg.agentId, actionType: 'create_social_post_draft', targetType: 'social_platform', input: cfg }) },
  { id: 'create_agent_voice_draft', label: 'Create voice draft', run: (cfg) => actionDrafts.build({ agentId: cfg.agentId,
actionType: 'create_voice_reply_draft', targetType: 'voice_ai', input: cfg }) },
  { id: 'request_admin_approval', label: 'Request admin approval', run: (cfg) => ({ approvalRequired: true, requested:
true, ref: store.maskDeep(cfg) }) },
  { id: 'notify_admin', label: 'Notify admin (draft)', run: (cfg) => actionDrafts.build({ agentId: cfg.agentId,
actionType: 'notify_admin_draft', targetType: 'support_inbox', input: cfg }) },

    { id: 'escalate_to_human', label: 'Escalate to human', run: (cfg) => ({ escalated: true, ref: store.maskDeep(cfg) }) },
    { id: 'update_agent_rules', label: 'Update agent rules', run: (cfg) => registry.update(cfg.agentId, cfg.patch || {}) },
];


function registry_() { return { triggers: TRIGGERS, actions: ACTIONS.map(({ id, label }) => ({ id, label })) }; }

module.exports = { TRIGGERS, ACTIONS, getRegistry: registry_ };
