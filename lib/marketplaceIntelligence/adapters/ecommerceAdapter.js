'use strict';
/** ecommerceAdapter.js — normalize ecommerce products/orders into seller-side offers
 *  with explicit ecommerce_product entities (used for price-spread opportunities). */
const { fromText, skuResolver } = require('./base');

/** payload: { products:[{name,price,currency,stock,url,platform}], ... } */
function toSignals(payload = {}, existingSkus = []) {
  const items = payload.products || (Array.isArray(payload) ? payload : [payload]);
  return items.map(p => {
    const match = skuResolver.matchOrCreate(p.name || '', existingSkus);
    const sig = fromText({
      text: `${p.name || ''} ${p.price ? 'price ' + p.price : ''} ${p.stock != null ? (p.stock > 0 ? 'in stock' : 'out of stock') : ''}`,
      who: p.platform || 'ecommerce', name: p.platform || 'store', productLabel: p.name,
      sku: match.sku, normalizedLabel: match.normalizedLabel,
      price: p.price ? { value: Number(p.price), currency: p.currency || 'PKR' } : null,
      sourceType: 'ecommerce', sourceId: p.platform || payload.platform || 'ecommerce', sourceName: p.platform || 'store',
      intent: 'offer', confidence: 0.8
    }, existingSkus);
    sig._ecommerce = { sku: match.sku, value: p.price ? Number(p.price) : null, currency: p.currency || 'PKR' };
    return sig;
  });
}
module.exports = { toSignals };
