'use strict';
/**
 * flowNodes.js — Flow Studio trigger/action registry entries for Marketplace
 * Intelligence. Exports definitions ONLY (no duplicate Flow Studio engine).
 * The server can register these into the existing Flow Studio node registry.
 *
 * All actions produce DRAFTS / notifications — none execute live by default.
 */

const TRIGGERS = [
  { id: 'marketplace.seller_offer_detected', label: 'Seller Offer Detected', outputs: ['sku', 'sellerId', 'price', 'sourceType'] },
  { id: 'marketplace.buyer_request_detected', label: 'Buyer Request Detected', outputs: ['sku', 'buyerId', 'quantity', 'sourceType'] },
  { id: 'marketplace.price_drop', label: 'Price Drop', outputs: ['sku', 'fromPrice', 'toPrice', 'changePct'] },
  { id: 'marketplace.price_spike', label: 'Price Spike', outputs: ['sku', 'fromPrice', 'toPrice', 'changePct'] },
  { id: 'marketplace.stock_low', label: 'Stock Low', outputs: ['sku', 'signal'] },
  { id: 'marketplace.stock_available', label: 'Stock Available', outputs: ['sku', 'signal'] },
  { id: 'marketplace.high_demand', label: 'High Demand', outputs: ['sku', 'demandCount'] },
  { id: 'marketplace.risky_seller_detected', label: 'Risky Seller Detected', outputs: ['sellerId', 'riskFlags'] },
  { id: 'marketplace.opportunity_detected', label: 'Opportunity Detected', outputs: ['type', 'sku', 'confidence'] },
  { id: 'marketplace.digest_ready', label: 'Digest Ready', outputs: ['summary'] }
];

const ACTIONS = [
  { id: 'create_channel_post_draft', label: 'Create Channel Post Draft', dryRun: true, inputs: ['sku', 'text'] },
  { id: 'create_social_post_draft', label: 'Create Social Post Draft', dryRun: true, inputs: ['sku', 'text', 'platform'] },
  { id: 'create_order_draft', label: 'Create Order Draft', dryRun: true, inputs: ['sku', 'qty', 'buyerId'] },
  { id: 'notify_admin', label: 'Notify Admin', dryRun: true, inputs: ['message'] },
  { id: 'assign_ai_agent', label: 'Assign AI Agent', dryRun: true, inputs: ['agentRole', 'context'] },
  { id: 'create_followup_task', label: 'Create Follow-up Task', dryRun: true, inputs: ['buyerId', 'note'] },
  { id: 'update_group_catalog_draft', label: 'Update Group Catalog Draft', dryRun: true, inputs: ['sku', 'price'] },
  { id: 'export_report_preview', label: 'Export Report Preview', dryRun: true, inputs: ['kind'] }
];

/** Register into an existing Flow Studio registry object if it supports addNode/registerTrigger. */
function registerInto(flowStudio) {
  if (!flowStudio) return { registered: false, reason: 'no flow studio registry provided' };
  let count = 0;
  try {
    TRIGGERS.forEach(t => { if (typeof flowStudio.registerTrigger === 'function') { flowStudio.registerTrigger(t); count++; } });
    ACTIONS.forEach(a => { if (typeof flowStudio.registerAction === 'function') { flowStudio.registerAction(a); count++; } });
  } catch (e) { return { registered: false, error: e.message }; }
  return { registered: count > 0, count };
}

module.exports = { TRIGGERS, ACTIONS, registerInto };
