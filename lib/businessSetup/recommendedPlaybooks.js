  'use strict';
  /** Maps playbook ids to safe, descriptive templates. No execution. */
  const CATALOG = {
    payment_verification: { id: 'payment_verification', title: 'Payment verification', dryRun: true, steps: ['receive proof', 'verify amount', 'mark paid (draft)'] },
    order_delivery: { id: 'order_delivery', title: 'Order delivery', dryRun: true, steps: ['confirm order', 'prepare delivery', 'send draft confirmation'] },
       sales_followup: { id: 'sales_followup', title: 'Sales follow-up', dryRun: true, steps: ['detect interest', 'draft follow-up', 'await approval'] },
   renewal_reminder: { id: 'renewal_reminder', title: 'Renewal reminder', dryRun: true, steps: ['detect expiry', 'draft reminder'] },
   order_fulfillment: { id: 'order_fulfillment', title: 'Order fulfillment', dryRun: true, steps: ['new order', 'pick/pack draft', 'status update draft'] },
   payment_reminder: { id: 'payment_reminder', title: 'Payment reminder', dryRun: true, steps: ['unpaid detected', 'draft reminder'] },
   abandoned_cart: { id: 'abandoned_cart', title: 'Abandoned cart recovery', dryRun: true, steps: ['cart idle', 'draft nudge'] },
   customer_followup: { id: 'customer_followup', title: 'Customer follow-up', dryRun: true, steps: ['post-purchase',
 'draft check-in'] },
   daily_price_digest: { id: 'daily_price_digest', title: 'Daily price digest', dryRun: true, steps: ['aggregate prices',
 'build digest artifact'] },
      stock_radar: { id: 'stock_radar', title: 'Stock radar', dryRun: true, steps: ['scan stock', 'flag changes'] },
      seller_buyer_match: { id: 'seller_buyer_match', title: 'Seller/buyer match', dryRun: true, steps: ['match offers',
 'draft intro'] },
   content_approval_queue: { id: 'content_approval_queue', title: 'Content approval queue', dryRun: true, steps:
 ['ingest', 'queue', 'await approval'] },
   daily_digest: { id: 'daily_digest', title: 'Daily digest', dryRun: true, steps: ['aggregate', 'build digest'] },
      social_republish: { id: 'social_republish', title: 'Social republish', dryRun: true, steps: ['select', 'draft repost']
 },
      category_routing: { id: 'category_routing', title: 'Category routing', dryRun: true, steps: ['classify', 'route draft']
 },
   duplicate_detector: { id: 'duplicate_detector', title: 'Duplicate detector', dryRun: true, steps: ['hash', 'compare',
 'flag'] },
      channel_post: { id: 'channel_post', title: 'Channel post', dryRun: true, steps: ['compose draft', 'await approval'] },
      lead_inbox: { id: 'lead_inbox', title: 'Lead inbox', dryRun: true, steps: ['capture', 'tag', 'assign'] },
      proposal_followup: { id: 'proposal_followup', title: 'Proposal follow-up', dryRun: true, steps: ['sent', 'draft nudge']
 },
   client_onboarding: { id: 'client_onboarding', title: 'Client onboarding', dryRun: true, steps: ['welcome draft',
 'collect info'] },
      support_sop: { id: 'support_sop', title: 'Support SOP', dryRun: true, steps: ['triage', 'draft reply', 'escalate'] },
      order_alert: { id: 'order_alert', title: 'Order alert', dryRun: true, steps: ['new order', 'notify admin draft'] },
      daily_offers: { id: 'daily_offers', title: 'Daily offers', dryRun: true, steps: ['pick offer', 'draft post'] },
      property_listing_draft: { id: 'property_listing_draft', title: 'Property listing draft', dryRun: true, steps:
 ['collect', 'draft listing'] },
   buyer_inquiry_tracking: { id: 'buyer_inquiry_tracking', title: 'Buyer inquiry tracking', dryRun: true, steps:
 ['capture', 'tag', 'follow-up draft'] },
   voice_followup: { id: 'voice_followup', title: 'Voice follow-up', dryRun: true, steps: ['draft script', 'await consent'] },
   source_channel_rules: { id: 'source_channel_rules', title: 'Source channel rules', dryRun: true, steps: ['define source', 'ingest draft'] },
   caption_cleaner: { id: 'caption_cleaner', title: 'Caption cleaner', dryRun: true, steps: ['strip', 'rebrand draft'] },
      queue_approval: { id: 'queue_approval', title: 'Queue approval', dryRun: true, steps: ['queue', 'await approval'] },
      social_repost: { id: 'social_repost', title: 'Social repost', dryRun: true, steps: ['select', 'draft repost'] },
      daily_routine: { id: 'daily_routine', title: 'Daily routine', dryRun: true, steps: ['morning digest', 'review'] },
 };
 function expand(ids) { return (ids || []).map((id) => CATALOG[id] || { id, title: id, dryRun: true, steps: [] }); }
 module.exports = { CATALOG, expand };
