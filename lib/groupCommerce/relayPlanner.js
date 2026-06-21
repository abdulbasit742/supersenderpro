 // lib/groupCommerce/relayPlanner.js
 // Group Commerce OS - plans relay DRAFTS between groups, WhatsApp channels, and
 // social. Never posts live unless GROUP_COMMERCE_LIVE_RELAY=true (and not dry-run).


 'use strict';

 const CONFIG = {
     liveRelay: String(process.env.GROUP_COMMERCE_LIVE_RELAY || 'false') === 'true',
     dryRun: String(process.env.GROUP_COMMERCE_DRY_RUN || 'true') === 'true',
 };
 function live() { return CONFIG.liveRelay && !CONFIG.dryRun; }


 function groupProductToChannelDraft(item) {
   return { kind: 'whatsapp_channel_draft', live: live(), text: `${item.productName} - ${item.currency || 'PKR'}
 ${item.latestPrice || 'ask'}. DM to order.`, note: live() ? 'would post to channel' : 'draft only' };
 }
 function sellerOfferToSocialDraft(offer) {


  return { kind: 'social_post_draft', live: live(), text: `Fresh stock: ${offer.productName} at ${offer.currency ||
'PKR'} ${offer.price}. Limited.`, note: live() ? 'would post to social' : 'draft only' };
}
function ecommerceProductToGroupDraft(product) {
  return { kind: 'group_post_draft', live: live(), text: `Now available: *${product.name}* (${product.currency || 'PKR'}
${product.price}).`, note: live() ? 'would post to group' : 'draft only' };
}
function marketSummaryDigest(catalog) {
  const items = Object.values((catalog && catalog.items) || {});
  const top = items.slice(0, 10).map((i) => `• ${i.productName}: ${i.currency || 'PKR'} ${i.latestPrice ||
'ask'}`).join('\n');
  return { kind: 'digest_draft', live: live(), text: `*Today's group market*
${top || 'No items yet.'}`, note: live() ? 'would post digest' : 'draft only' };
}


module.exports = { groupProductToChannelDraft, sellerOfferToSocialDraft, ecommerceProductToGroupDraft,
marketSummaryDigest, CONFIG };
