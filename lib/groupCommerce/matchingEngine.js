// lib/groupCommerce/matchingEngine.js - Buyer <-> Seller Auto-Matching Engine
const catalog = require('./catalog');
const messageAnalyzer = require('./messageAnalyzer');

// Match a buyer request (free text or structured) against active seller catalog
function matchBuyerToSellers(groupId, buyerRequest) {
  const analysis = typeof buyerRequest === 'string'
    ? messageAnalyzer.analyzeMessage(buyerRequest)
    : buyerRequest;

  const items = catalog.listGroupCatalog(groupId);
  const matches = [];

  items.forEach(item => {
    let score = 0;
    const reasons = [];

    // SKU exact match
    if (analysis.sku && item.sku.toUpperCase() === String(analysis.sku).toUpperCase()) {
      score += 0.6;
      reasons.push('SKU exact match');
    }

    // Product name fuzzy match
    if (analysis.productName && item.productName.toLowerCase().includes(String(analysis.productName).toLowerCase())) {
      score += 0.3;
      reasons.push('Product name match');
    }

    // Stock availability
    if (item.stock > 0) {
      score += 0.05;
      reasons.push('In stock');
    } else {
      reasons.push('Out of stock');
    }

    // Price within buyer budget (if buyer mentioned a price as max budget)
    if (analysis.price && item.latestPrice <= analysis.price) {
      score += 0.05;
      reasons.push('Within budget');
    }

    if (score > 0) {
      matches.push({
        sku: item.sku,
        productName: item.productName,
        price: item.latestPrice,
        currency: item.currency,
        stock: item.stock,
        trustedSellers: item.trustedSellers,
        matchScore: Math.min(Math.round(score * 100) / 100, 1),
        reasons
      });
    }
  });

  matches.sort((a, b) => b.matchScore - a.matchScore);

  return {
    success: true,
    buyerIntent: analysis,
    matchCount: matches.length,
    matches,
    dryRun: true
  };
}

module.exports = { matchBuyerToSellers };
