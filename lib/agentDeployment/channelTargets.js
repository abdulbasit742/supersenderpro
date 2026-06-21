const TARGET_TYPES = [
  'whatsapp_chat', 'whatsapp_group', 'whatsapp_channel', 'ecommerce_store',
     'social_platform', 'voice_ai', 'marketplace_intelligence', 'support_inbox',
     'payment_workflow', 'order_workflow', 'flow_studio',
];

// Which env flag gates LIVE action for each target. Default all false.
const LIVE_FLAG_BY_TARGET = {
     whatsapp_chat: 'AGENT_DEPLOYMENT_ALLOW_LIVE_WHATSAPP',
     whatsapp_group: 'AGENT_DEPLOYMENT_ALLOW_LIVE_WHATSAPP',
     whatsapp_channel: 'AGENT_DEPLOYMENT_ALLOW_LIVE_CHANNEL',
     social_platform: 'AGENT_DEPLOYMENT_ALLOW_LIVE_SOCIAL',
     ecommerce_store: 'AGENT_DEPLOYMENT_ALLOW_LIVE_ECOMMERCE',
     order_workflow: 'AGENT_DEPLOYMENT_ALLOW_LIVE_ECOMMERCE',
     payment_workflow: 'AGENT_DEPLOYMENT_ALLOW_LIVE_PAYMENT',
     voice_ai: 'AGENT_DEPLOYMENT_ALLOW_LIVE_VOICE',
     // these are read/draft-only coordination targets, no live flag needed
     marketplace_intelligence: null,
     support_inbox: null,
     flow_studio: null,
};


// Existing system each target coordinates with (for docs / inventory only).
const REUSES = {
     whatsapp_chat: 'omnichannel inbox + WABA router',
     whatsapp_group: 'Group Commerce OS',
     whatsapp_channel: 'Channel Automation',
     ecommerce_store: 'catalog + checkout module',
     social_platform: 'social hub',
     voice_ai: 'Voice AI module',
     marketplace_intelligence: 'Marketplace Intelligence layer',
     support_inbox: 'omnichannel inbox',
     payment_workflow: 'payments module',
     order_workflow: 'catalog/orders',
     flow_studio: 'Flow Studio (lib/superflow)',
};

function isValidTarget(t) { return TARGET_TYPES.includes(t); }
function liveFlagFor(t) { return LIVE_FLAG_BY_TARGET[t] || null; }
function isLiveAllowed(t) {
     const flag = liveFlagFor(t);
     if (!flag) return false; // draft-only targets never go live

   return String(process.env[flag] || 'false') === 'true';
}
function describe() {
   return TARGET_TYPES.map((t) => ({
     type: t,
    reuses: REUSES[t],
    liveFlag: liveFlagFor(t),
     liveAllowed: isLiveAllowed(t),
   }));
}

module.exports = { TARGET_TYPES, LIVE_FLAG_BY_TARGET, REUSES, isValidTarget, liveFlagFor, isLiveAllowed, describe };
