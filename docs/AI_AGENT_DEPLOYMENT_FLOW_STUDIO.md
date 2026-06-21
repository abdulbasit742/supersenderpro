 # AI Agent Deployment — Flow Studio Hooks


 This adds trigger/action registry entries to the EXISTING Flow Studio
 (`lib/superflow`). It does not create a second Flow Studio.

 ## Triggers
 agent.deployed, agent.disabled, agent.action_suggested, agent.approval_needed,
 agent.escalation_needed, agent.rate_limit_hit, agent.safety_blocked,
 agent.reply_drafted, agent.voice_draft_created, agent.channel_post_drafted,
 agent.marketplace_opportunity_found

 ## Actions (all dry-run/draft-safe)
 deploy_agent_to_target, disable_agent, create_agent_reply_draft,
 create_agent_channel_post_draft, create_agent_social_post_draft,
 create_agent_voice_draft, request_admin_approval, notify_admin,
 escalate_to_human, update_agent_rules


 ## How to register (append-only)
 In your Flow Studio bootstrap, import and register without modifying the engine:

  ```js
  // BEGIN AI AGENT DEPLOYMENT HOOK
  const adNodes = require('./lib/agentDeployment/flowNodes');
  adNodes.TRIGGERS.forEach((tr) => superflow.registerTrigger(tr));
  adNodes.ACTIONS.forEach((ac) => superflow.registerAction(ac));
  // END AI AGENT DEPLOYMENT HOOK

Exact register function names depend on your Flow Studio API; adapt the two calls.
