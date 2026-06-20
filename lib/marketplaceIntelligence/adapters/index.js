'use strict';
/**
 * adapters — convert raw input from EXISTING modules into normalized marketplace
 * signals. Adapters NEVER read/write the source systems directly; callers pass
 * already-fetched data. All output is masked + dry-run safe.
 */
const { fromText } = require('./base');

const groupCommerceAdapter = require('./groupCommerceAdapter');
const channelAutomationAdapter = require('./channelAutomationAdapter');
const ecommerceAdapter = require('./ecommerceAdapter');
const socialAdapter = require('./socialAdapter');
const dealerAdapter = require('./dealerAdapter');
const orderAdapter = require('./orderAdapter');

/** Route a raw payload to the right adapter by sourceType. */
function normalize(sourceType, payload, existingSkus = []) {
  switch (String(sourceType || '').toLowerCase()) {
    case 'group': case 'whatsapp_group': return groupCommerceAdapter.toSignals(payload, existingSkus);
    case 'chat': case 'whatsapp_chat': return groupCommerceAdapter.toSignals({ ...payload, sourceType: 'whatsapp_chat' }, existingSkus);
    case 'channel': case 'channel_automation': return channelAutomationAdapter.toSignals(payload, existingSkus);
    case 'ecommerce': case 'ecommerce_product': case 'order_eco': return ecommerceAdapter.toSignals(payload, existingSkus);
    case 'social': case 'social_post': return socialAdapter.toSignals(payload, existingSkus);
    case 'dealer': case 'seller_rates': return dealerAdapter.toSignals(payload, existingSkus);
    case 'order': return orderAdapter.toSignals(payload, existingSkus);
    default: {
      const arr = Array.isArray(payload) ? payload : [payload];
      return arr.map(p => fromText({ ...p, sourceType: sourceType || 'unknown' }, existingSkus));
    }
  }
}

module.exports = { fromText, normalize, groupCommerceAdapter, channelAutomationAdapter, ecommerceAdapter, socialAdapter, dealerAdapter, orderAdapter };
