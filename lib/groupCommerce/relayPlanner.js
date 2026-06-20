// lib/groupCommerce/relayPlanner.js - Broadcast & WhatsApp Channel Relays
const catalog = require('./catalog');

const LIVE_RELAY = process.env.GROUP_COMMERCE_LIVE_RELAY === 'true';

function planGroupToChannelRelay(groupId) {
  const post = catalog.generateWhatsAppGroupCatalogPost(groupId);
  return {
    targetPlatform: 'whatsapp_channel',
    channelId: 'chan-whatsapp-broadcast',
    draftText: post,
    dryRun: !LIVE_RELAY,
    message: LIVE_RELAY ? 'Message sent directly' : 'Draft generated successfully'
  };
}

const planSellerRelay = (groupId, sellerOffer) => {
  let text = "🔥 *SELLER OFFER DETECTED* 🔥\n\n";
  text += "Merchant verified item: *" + (sellerOffer.productName || 'Product') + "*\n";
  text += "SKU Code: `" + (sellerOffer.sku || 'DRAFT-SKU') + "`\n";
  text += "Price: Rs. " + (sellerOffer.price ? sellerOffer.price.toLocaleString() : 'N/A') + "\n";
  text += "Stock: " + (sellerOffer.quantity || 0) + " units left!\n\n";
  text += "📲 Place your orders today. (Verified Group Commerce Sync)";

  return {
    targetPlatform: 'social_media',
    platforms: ['facebook', 'instagram', 'twitter'],
    draftText: text,
    dryRun: !LIVE_RELAY
  };
};

function planMarketDigest(groupId) {
  const items = catalog.listGroupCatalog(groupId);
  let digest = "📊 *MARKET RECAP: ACTIVE LISTINGS* 📊\n";
  digest += "Group ID: " + groupId + " | Sync Time: " + new Date().toLocaleTimeString() + "\n";
  digest += "═══════════════════════════\n\n";

  if (items.length === 0) {
    digest += "No active listings found in this group today.";
  } else {
    items.forEach(item => {
      digest += "• *" + item.productName + "* (" + item.sku + ") - Price Rs. " + item.latestPrice.toLocaleString() + " - Stock: " + item.stock + " left\n";
    });
  }

  return {
    targetPlatform: 'social_media_digest',
    draftText: digest,
    dryRun: !LIVE_RELAY
  };
}

module.exports = {
  planGroupToChannelRelay,
  planSellerRelay,
  planMarketDigest
};
