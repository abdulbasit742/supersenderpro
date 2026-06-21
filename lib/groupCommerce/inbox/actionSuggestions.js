 'use strict';

 /**
     * Group Commerce Inbox — safe action suggestions.
     * Every suggestion is a DRY-RUN DRAFT describing what an admin COULD do.
     * Nothing here sends, posts, deletes, removes, charges, or writes ecommerce data.
     * Live execution (later) must go through the existing adapter layer, never here.
     */

 const AUTO_ACTIONS = String(process.env.GROUP_COMMERCE_INBOX_AUTO_ACTIONS || 'false').toLowerCase() === 'true';

 function draft(type, label, payload) {
   return {
          type: type,
          label: label,
          dryRun: true,
          autoExecute: false, // never auto-execute from the inbox
          payload: payload || {},
          note: 'Draft only. No live action performed.',
      };
 }

 // Build a list of suggested action drafts for a single normalized inbox item.
 function suggestForItem(item) {
   const x = item || {};
      const suggestions = [];


      if (x.type === 'seller_offer' || x.roleIntent === 'seller') {
        suggestions.push(draft('create_catalogue_draft', 'Create catalogue draft', { sku: x.sku, productName: x.productName,
 price: x.price, currency: x.currency, stockStatus: x.stockStatus }));
     suggestions.push(draft('create_channel_post_draft', 'Draft WhatsApp channel post', { productName: x.productName,
 price: x.price, currency: x.currency }));
     suggestions.push(draft('create_social_post_draft', 'Draft social post', { productName: x.productName, price: x.price,
 currency: x.currency }));
   }

      if (x.type === 'buyer_request' || x.roleIntent === 'buyer') {
     suggestions.push(draft('create_order_draft', 'Create order draft', { productName: x.productName, quantity: x.quantity
 || 1, buyerIdMasked: x.buyerIdMasked }));
     suggestions.push(draft('create_group_reply_draft', 'Draft WhatsApp group reply', { groupId: x.groupId, body: 'Yeh available hai. SKU + quantity bata dein.' }));
      }

      if (x.type === 'price_update' || x.type === 'stock_update' || x.type === 'catalog_update') {
        suggestions.push(draft('create_catalogue_draft', 'Update catalogue draft', { sku: x.sku, price: x.price, currency:
 x.currency, stockStatus: x.stockStatus }));
   }

  if (x.type === 'suspicious_post' || x.riskLevel === 'high') {
    suggestions.push(draft('notify_admin_draft', 'Notify admin (draft)', { severity: 'high', reason: (x.flags ||
[]).join(', ') || 'suspicious activity', groupId: x.groupId }));
  suggestions.push(draft('warn_seller_draft', 'Warn seller (draft)', { sellerIdMasked: x.sellerIdMasked, reason:
'policy review' }));
  suggestions.push(draft('pause_group_ai_draft', 'Pause group AI (draft)', { groupId: x.groupId, minutes: 5 }));
  }

  if ((x.confidence || 0) >= 0.7 && (x.type === 'seller_offer' || x.roleIntent === 'seller')) {
    suggestions.push(draft('assign_ai_agent_draft', 'Assign AI agent (draft)', { groupId: x.groupId, agent:
'seller_intelligence' }));
}

  // Always available admin controls.
  suggestions.push(draft('mark_as_resolved', 'Mark as resolved', { id: x.id }));

  return { autoActionsEnabled: AUTO_ACTIONS, dryRun: true, suggestions: suggestions };
}


module.exports = { suggestForItem, AUTO_ACTIONS };
