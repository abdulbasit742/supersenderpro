'use strict';
/** orderAdapter.js — normalize order signals (private/admin only). Creates demand/buyer
 *  signals from order intent. Never creates real orders. */
const { fromText, skuResolver } = require('./base');

/** payload: { orders:[{buyer,product,qty,amount,city}], ... } */
function toSignals(payload = {}, existingSkus = []) {
  const items = payload.orders || (Array.isArray(payload) ? payload : [payload]);
  return items.map(o => {
    const match = skuResolver.matchOrCreate(o.product || '', existingSkus);
    return fromText({
      text: `${o.product || ''} order qty ${o.qty || 1}`,
      who: o.buyer || o.customer, name: o.buyer || o.customer, city: o.city,
      productLabel: o.product, sku: match.sku, normalizedLabel: match.normalizedLabel,
      quantity: o.qty || 1, budget: o.amount ? Number(o.amount) : null,
      sourceType: 'order', sourceId: o.sourceId || 'orders', sourceName: 'orders',
      intent: 'demand', confidence: 0.7
    }, existingSkus);
  });
}
module.exports = { toSignals };
