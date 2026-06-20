// lib/groupCommerce/priceIntelligence.js - SKU Price Analytics & Trend Detection
const catalog = require('./catalog');

function analyzeSku(groupId, sku) {
  const items = catalog.listGroupCatalog(groupId);
  const item = items.find(i => i.sku.toUpperCase() === String(sku).toUpperCase());
  if (!item) {
    return { success: false, error: 'SKU not found in group catalog' };
  }

  const spread = item.maxPrice - item.minPrice;
  const spreadPct = item.minPrice > 0 ? Math.round((spread / item.minPrice) * 100) : 0;
  const position = spread > 0
    ? Math.round(((item.latestPrice - item.minPrice) / spread) * 100)
    : 0;

  let signal = 'stable';
  if (position <= 25) signal = 'good_buy';
  else if (position >= 75) signal = 'overpriced';

  return {
    success: true,
    sku: item.sku,
    productName: item.productName,
    latestPrice: item.latestPrice,
    minPrice: item.minPrice,
    maxPrice: item.maxPrice,
    currency: item.currency,
    priceSpread: spread,
    priceSpreadPct: spreadPct,
    pricePosition: position, // 0 = cheapest seen, 100 = most expensive seen
    signal,
    recommendation: signal === 'good_buy'
      ? 'Current price is near the lowest recorded. Good time to buy.'
      : signal === 'overpriced'
        ? 'Current price is near the highest recorded. Consider waiting or negotiating.'
        : 'Price is in the normal range.'
  };
}

function marketOverview(groupId) {
  const items = catalog.listGroupCatalog(groupId);
  const totalSkus = items.length;
  const totalStock = items.reduce((s, i) => s + (i.stock || 0), 0);
  const inventoryValue = items.reduce((s, i) => s + (i.latestPrice * (i.stock || 0)), 0);
  const outOfStock = items.filter(i => (i.stock || 0) === 0).length;

  const cheapest = items.slice().sort((a, b) => a.latestPrice - b.latestPrice)[0] || null;
  const priciest = items.slice().sort((a, b) => b.latestPrice - a.latestPrice)[0] || null;

  return {
    success: true,
    groupId,
    totalSkus,
    totalStock,
    inventoryValue,
    outOfStockCount: outOfStock,
    cheapestItem: cheapest ? { sku: cheapest.sku, name: cheapest.productName, price: cheapest.latestPrice } : null,
    priciestItem: priciest ? { sku: priciest.sku, name: priciest.productName, price: priciest.latestPrice } : null
  };
}

module.exports = { analyzeSku, marketOverview };
