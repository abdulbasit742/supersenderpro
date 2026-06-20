'use strict';
/** dealerAdapter.js — normalize existing dealer/seller-rate rows (e.g. seller_rates.json)
 *  into seller offer signals. Consumes already-parsed rows; does NOT re-run the parser. */
const { fromText, skuResolver } = require('./base');

/** payload: { rates:[{seller,product,price,city,stock}], ... } */
function toSignals(payload = {}, existingSkus = []) {
  const items = payload.rates || (Array.isArray(payload) ? payload : [payload]);
  return items.map(r => {
    const match = skuResolver.matchOrCreate(r.product || r.item || '', existingSkus);
    return fromText({
      text: `${r.product || r.item || ''} rate ${r.price || r.rate || ''} ${r.stock || ''}`,
      who: r.seller || r.dealer || r.name, name: r.seller || r.dealer || r.name, city: r.city,
      productLabel: r.product || r.item, sku: match.sku, normalizedLabel: match.normalizedLabel,
      price: (r.price || r.rate) ? { value: Number(String(r.price || r.rate).replace(/[^0-9.]/g, '')), currency: 'PKR' } : null,
      sourceType: 'dealer', sourceId: r.sourceId || 'dealer_intel', sourceName: r.sourceName || 'dealer',
      intent: 'offer', confidence: 0.75
    }, existingSkus);
  });
}
module.exports = { toSignals };
