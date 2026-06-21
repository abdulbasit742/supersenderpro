const safetyGuard = require('./safetyGuard');
const registry = require('./agentRegistry');
const store = require('./store');

const DRAFT_ACTIONS = [
     'suggest_reply', 'create_whatsapp_message_draft', 'create_channel_post_draft',
     'create_social_post_draft', 'create_voice_reply_draft', 'create_ecommerce_product_draft',
     'create_order_draft', 'create_payment_reminder_draft', 'create_followup_task_draft',
     'notify_admin_draft', 'summarize_conversation', 'summarize_group_market',
     'classify_message', 'detect_intent', 'detect_seller_offer', 'detect_buyer_request',
     'generate_caption', 'generate_voiceover_script',
];

function preview(actionType, input) {
  const text = store.maskValue(String(input.text || input.sample || ''));
     switch (actionType) {
       case 'suggest_reply':
        return { kind: 'reply', text: 'Suggested reply (draft): ' + (text || 'Hello, how can I help?') };
      case 'create_whatsapp_message_draft':
        return { kind: 'whatsapp_message', to: store.maskValue(input.target || ''), text: text || '[draft message]' };
      case 'create_channel_post_draft':
        return { kind: 'channel_post', text: text || '[channel post draft]' };
      case 'create_social_post_draft':
        return { kind: 'social_post', caption: text || '[social caption draft]' };
      case 'create_voice_reply_draft':
        return { kind: 'voice_script', script: text || '[voiceover script draft]' };
      case 'create_ecommerce_product_draft':
        return { kind: 'product', title: input.title || '[product title]', price: input.price || null };
      case 'create_order_draft':
        return { kind: 'order', items: input.items || [], note: 'draft only' };
      case 'create_payment_reminder_draft':
        return { kind: 'payment_reminder', to: store.maskValue(input.target || ''), text: '[payment reminder draft]' };
      case 'create_followup_task_draft':
        return { kind: 'task', title: input.title || 'Follow up', due: input.due || null };
      case 'notify_admin_draft':
        return { kind: 'admin_notice', text: text || '[admin notification draft]' };
      case 'summarize_conversation':

          return { kind: 'summary', summary: '[conversation summary preview]' };
        case 'summarize_group_market':
          return { kind: 'market_summary', summary: '[group market summary preview]' };
        case 'classify_message':
          return { kind: 'classification', label: 'inquiry', confidence: 0.5 };
        case 'detect_intent':
          return { kind: 'intent', intent: 'unknown', confidence: 0.5 };
        case 'detect_seller_offer':
          return { kind: 'seller_offer', detected: false };
        case 'detect_buyer_request':
          return { kind: 'buyer_request', detected: false };
        case 'generate_caption':
          return { kind: 'caption', caption: '[caption draft]' };
        case 'generate_voiceover_script':
          return { kind: 'voiceover', script: '[voiceover draft]' };
        default:
          return { kind: 'unknown' };
    }
}


/**
   * build({ agentId, actionType, targetType, target, approved, input })
   */
function build(params) {
 const p = params || {};
    const agent = registry.get(p.agentId) || registry.defaults({ id: p.agentId || 'ephemeral' });
    const actionType = p.actionType;

    if (!DRAFT_ACTIONS.includes(actionType)) {
        return {
          dryRun: true, approvalRequired: true, actionType, target: p.targetType || null,
          payloadPreview: null, warnings: [], blockedReasons: ['unknown_action_type'],
          nextStep: 'choose a supported draft action',
        };
    }

    const guard = safetyGuard.check({
      agent, action: actionType, targetType: p.targetType, approved: p.approved === true,
    });


    const result = {
        dryRun: true,                   // drafts are ALWAYS dry-run
        approvalRequired: true,         // and ALWAYS require approval to go live
        actionType,
        target: { type: p.targetType || null, id: store.maskValue(p.target || '') },
        payloadPreview: store.maskDeep(preview(actionType, Object.assign({ target: p.target }, p.input || {}))),
        warnings: guard.warnings,
        blockedReasons: guard.blocked ? guard.blockedReasons : [],
        nextStep: guard.blocked
          ? 'resolve blockers'
          : (guard.allowLive ? 'admin may approve live execution' : 'review draft; live disabled by default'),
    };
    store.appendHistory({ kind: 'action_draft', agentId: agent.id, actionType, targetType: p.targetType });
    return result;
}

module.exports = { DRAFT_ACTIONS, build, preview };
