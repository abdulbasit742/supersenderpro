// lib/groupCommerce/flowNodes.js
// Group Commerce OS - SuperFlow Studio node definitions. NOT a new builder; these
// are trigger/action registry entries SuperFlow can import. Pure data + safe
// dry-run executors that return "would do" descriptions.


'use strict';


const TRIGGERS = [
  'group_message_received', 'seller_offer_detected', 'buyer_request_detected',
     'sku_price_changed', 'stock_changed', 'banned_link_detected',
     'group_pause_started', 'group_pause_ended', 'group_catalog_updated',
];


const ACTIONS = [
  'create_group_catalog_post', 'create_channel_post_draft', 'create_social_post_draft',
     'create_order_draft', 'notify_admin', 'warn_group_member',
     'pause_group_ai', 'assign_ai_agent', 'sync_ecommerce_preview',
];


// Each action executor returns a dry-run description; SuperFlow's engine already
// treats actions as "wouldDo" in simulation, so these are safe by construction.
function describeAction(action, node, ctx) {
  const c = ctx || {};
     switch (action) {
       case 'create_group_catalog_post': return { action, note: 'would generate a group catalogue post draft', groupId:
c.groupId };
    case 'create_channel_post_draft': return { action, note: 'would draft a WhatsApp channel post' };
         case 'create_social_post_draft': return { action, note: 'would draft a social post' };
         case 'create_order_draft': return { action, note: 'would create an order draft (no real order)' };
         case 'notify_admin': return { action, message: node.message || 'admin notification' };
         case 'warn_group_member': return { action, note: 'would warn a member (dry-run)' };
         case 'pause_group_ai': return { action, minutes: node.minutes || 5, note: 'would pause group AI' };
         case 'assign_ai_agent': return { action, agent: node.agent || 'sales' };
         case 'sync_ecommerce_preview': return { action, note: 'would generate ecommerce<->group preview (no live write)' };
         default: return { action, note: 'unknown group-commerce action' };
     }
}

// Export in a shape SuperFlow can register. Wire from SuperFlow side, e.g.:
//       const gc = require('../groupCommerce/flowNodes');
//       gc.TRIGGERS / gc.ACTIONS added to the palette; gc.describeAction used in sim.
module.exports = { TRIGGERS, ACTIONS, describeAction };
