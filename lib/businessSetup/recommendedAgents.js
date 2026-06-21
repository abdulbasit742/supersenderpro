 'use strict';
 /** Maps agent type ids to safe descriptors aligned with the AI Agent Deployment Center. */
 const CATALOG = {

      sales_agent: { type: 'sales_agent', label: 'Sales agent', dryRun: true, approvalRequired: true },
      support_agent: { type: 'support_agent', label: 'Support agent', dryRun: true, approvalRequired: true },
      payment_agent: { type: 'payment_agent', label: 'Payment agent', dryRun: true, approvalRequired: true },
      renewal_agent: { type: 'renewal_agent', label: 'Renewal agent', dryRun: true, approvalRequired: true },
      ecommerce_agent: { type: 'ecommerce_agent', label: 'Ecommerce agent', dryRun: true, approvalRequired: true },
   seller_intelligence_agent: { type: 'seller_intelligence_agent', label: 'Seller intelligence agent', dryRun: true,
 approvalRequired: true },
   buyer_matching_agent: { type: 'buyer_matching_agent', label: 'Buyer matching agent', dryRun: true, approvalRequired:
 true },
   marketplace_advisor_agent: { type: 'marketplace_advisor_agent', label: 'Marketplace advisor agent', dryRun: true,
 approvalRequired: true },
   channel_publisher_agent: { type: 'channel_publisher_agent', label: 'Channel publisher agent', dryRun: true,
 approvalRequired: true },
   social_caption_agent: { type: 'social_caption_agent', label: 'Social caption agent', dryRun: true, approvalRequired:
 true },
      voice_agent: { type: 'voice_agent', label: 'Voice agent', dryRun: true, approvalRequired: true },
 };
 function expand(ids) { return (ids || []).map((id) => CATALOG[id] || { type: id, label: id, dryRun: true,
 approvalRequired: true }); }
 module.exports = { CATALOG, expand };
