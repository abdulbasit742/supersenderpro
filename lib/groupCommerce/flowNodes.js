// lib/groupCommerce/flowNodes.js - Automation Trigger & Action Flow Studio Node definitions
const triggers = [
  {
    type: 'group_message_received',
    label: 'Group Message Received',
    description: 'Fires when any message is posted to a monitored WhatsApp Group.'
  },
  {
    type: 'seller_offer_detected',
    label: 'Seller Offer Detected',
    description: 'Fires when AI or analyzer extracts seller pricing or stock offerings.'
  },
  {
    type: 'buyer_request_detected',
    label: 'Buyer Request Detected',
    description: 'Fires when buyer intent is recognized inside group discussion logs.'
  },
  {
    type: 'sku_price_changed',
    label: 'SKU Price Changed',
    description: 'Fires when the catalog registers a new min or max price for a tracked SKU.'
  },
  {
    type: 'stock_changed',
    label: 'Stock Quantity Changed',
    description: 'Fires when stock levels sync or alter inside group catalog logs.'
  },
  {
    type: 'banned_link_detected',
    label: 'Banned Link Detected',
    description: 'Fires when a restricted external URL link matches group moderation.'
  },
  {
    type: 'group_pause_started',
    label: 'Group Pause Started',
    description: 'Fires when an admin triggers temporary mute pause timers.'
  },
  {
    type: 'group_pause_ended',
    label: 'Group Pause Ended',
    description: 'Fires automatically when pause group timer reaches duration expiration.'
  },
  {
    type: 'group_catalog_updated',
    label: 'Group Catalog Updated',
    description: 'Fires when catalog items are imported or manually modified.'
  }
];

const actions = [
  {
    type: 'create_group_catalog_post',
    label: 'Generate Group Catalog Broadcast',
    description: 'Creates a stylized catalog listing suitable for direct group chat posting.'
  },
  {
    type: 'create_channel_post_draft',
    label: 'Generate Channel Post Draft',
    description: 'Formulates a WhatsApp channel broadcast update draft.'
  },
  {
    type: 'create_social_post_draft',
    label: 'Generate Social Post Draft',
    description: 'Creates Facebook, Instagram, or social media post drafts.'
  },
  {
    type: 'create_order_draft',
    label: 'Create E-commerce Order Draft',
    description: 'Drafts order requests in CRM/ecommerce sync modules.'
  },
  {
    type: 'notify_admin',
    label: 'Notify Group Owner/Admin',
    description: 'Flags urgent violations or high-value seller matches to admins.'
  },
  {
    type: 'warn_group_member',
    label: 'Warn Group Member',
    description: 'Sends automated warning logs to members violating policies.'
  },
  {
    type: 'pause_group_ai',
    label: 'Mute Group AI Replies',
    description: 'Temporarily suspends AI automated reply and extraction pipelines.'
  },
  {
    type: 'assign_ai_agent',
    label: 'Assign AI Persona Role',
    description: 'Applies automated agents (sales, support, moderation) to a group.'
  },
  {
    type: 'sync_ecommerce_preview',
    label: 'Preview E-commerce Synchronization',
    description: 'Initiates draft previews matching stock/inventories.'
  }
];

module.exports = {
  triggers,
  actions
};
