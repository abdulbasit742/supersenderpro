const channelTargets = require('./channelTargets');
const store = require('./store');

const RISKY_ACTIONS = new Set([
        'create_whatsapp_message_draft', 'create_channel_post_draft',
        'create_social_post_draft', 'create_voice_reply_draft',
        'create_ecommerce_product_draft', 'create_order_draft',
        'create_payment_reminder_draft',
]);


// in-memory rate counter (per agent, per hour bucket)
const rateBuckets = new Map();
function bucketKey(agentId) {
  const hour = Math.floor(Date.now() / 3600000);
        return agentId + ':' + hour;
}
function hitRateLimit(agent) {
  const key = bucketKey(agent.id);
        const n = (rateBuckets.get(key) || 0) + 1;
        rateBuckets.set(key, n);
        return n > (agent.maxActionsPerHour || 20);
}

function globalDryRun() {
        return String(process.env.AGENT_DEPLOYMENT_DRY_RUN || 'true') !== 'false';
}
function globalRequireApproval() {
  return String(process.env.AGENT_DEPLOYMENT_REQUIRE_APPROVAL || 'true') !== 'false';
}

/**
 * check({ agent, deployment, action, targetType, approved })
    * returns { allowLive, mustDraft, blocked, blockedReasons, warnings }
    */
function check(ctx) {
  const { agent, action, targetType, approved } = ctx || {};

   const blockedReasons = [];
   const warnings = [];

   if (!agent) blockedReasons.push('no_agent');
   if (agent && agent.enabled === false) warnings.push('agent_disabled');
   if (targetType && !channelTargets.isValidTarget(targetType)) blockedReasons.push('invalid_target');
   if (agent && Array.isArray(agent.blockedActions) && agent.blockedActions.includes(action)) {
       blockedReasons.push('action_blocked_by_agent_policy');
   }

   const risky = RISKY_ACTIONS.has(action);
   const targetLiveAllowed = targetType ? channelTargets.isLiveAllowed(targetType) : false;

   // rate limit
   if (agent && hitRateLimit(agent)) {
       blockedReasons.push('rate_limit_exceeded');
   }

   // decide
   let allowLive = false;
   if (!blockedReasons.length) {
       const approvalOk = !globalRequireApproval() || !agent.approvalRequired || approved === true;
       allowLive = !globalDryRun() && agent.dryRun === false && targetLiveAllowed && approvalOk && !risky
        ? true
        : (!globalDryRun() && agent.dryRun === false && targetLiveAllowed && approvalOk && risky && approved === true);
   }


   if (risky && !targetLiveAllowed) warnings.push('live_disabled_for_target');
   if (globalDryRun()) warnings.push('global_dry_run_on');


   const result = {
       allowLive: !!allowLive,
       mustDraft: !allowLive && !blockedReasons.length,
       blocked: blockedReasons.length > 0,
       blockedReasons,
       warnings,
   };
   store.appendAudit({ kind: 'safety_check', agentId: agent && agent.id, action, targetType, result });
   return result;
}


module.exports = { check, RISKY_ACTIONS, globalDryRun, globalRequireApproval };
