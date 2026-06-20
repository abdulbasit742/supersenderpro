// lib/groupCommerce/messageAnalyzer.js - Message Seller/Buyer/SKU Intelligence Extraction
const store = require('./store');

function analyzeMessage(messageText) {
  const text = String(messageText || '').trim();

  const analysis = {
    roleIntent: 'general',
    sku: null,
    productName: null,
    quantity: 1,
    price: null,
    currency: 'PKR',
    stockStatus: 'available',
    sellerConfidence: 0.0,
    buyerConfidence: 0.0,
    flags: []
  };

  if (!text) return analysis;

  // SKU matching: Match SKU- followed by uppercase alphanumeric characters and hyphens/underscores
  const skuMatch = text.match(/\b(SKU-[A-Z0-9\-]+)\b/i) || 
                   text.match(/\b([A-Z0-9\-]+-SKU)\b/i) ||
                   text.match(/\b(SKU\s*:\s*([A-Z0-9\-]+))\b/i);
  if (skuMatch) {
    analysis.sku = (skuMatch[2] || skuMatch[1]).toUpperCase();
  }

  // Price analysis
  const priceMatch = text.match(/\b(\d+k|\d+\s*thousand|\d+,\d+|\d{4,7})\s*(pkr|rs|k|usd)?\b/i);
  if (priceMatch) {
    let priceStr = priceMatch[1].toLowerCase();
    let priceVal = 0;
    if (priceStr.endsWith('k')) {
      priceVal = parseFloat(priceStr) * 1000;
    } else {
      priceVal = parseInt(priceStr.replace(/,/g, ''), 10);
    }
    analysis.price = priceVal;
  }

  // Quantity analysis: Parse correctly based on index matches
  const qtyMatch = text.match(/\b(\d+)\s*(pcs|pieces|items|quantity|units|qty)\b/i);
  if (qtyMatch) {
    analysis.quantity = parseInt(qtyMatch[1], 10);
  } else {
    const qtyColonMatch = text.match(/\b(qty|pieces|pcs)\s*:\s*(\d+)\b/i);
    if (qtyColonMatch) {
      analysis.quantity = parseInt(qtyColonMatch[2], 10);
    }
  }

  if (text.toLowerCase().includes('stock out') || text.toLowerCase().includes('out of stock') || text.toLowerCase().includes('sold out')) {
    analysis.stockStatus = 'out_of_stock';
  } else if (text.toLowerCase().includes('available') || text.toLowerCase().includes('in stock') || text.toLowerCase().includes('stock updated')) {
    analysis.stockStatus = 'available';
  }

  const productWords = ["iphone", "ipad", "canva", "netflix", "macbook", "samsung", "charger", "ssd", "ram", "hard disk", "keyboard", "mouse"];
  for (const word of productWords) {
    if (text.toLowerCase().includes(word)) {
      analysis.productName = word.charAt(0).toUpperCase() + word.slice(1);
      break;
    }
  }

  const sellerKeywords = ["available", "selling", "sell", "pcs available", "stock updated", "offer", "price updated", "seller available"];
  const buyerKeywords = ["need", "buyer wants", "looking for", "want to buy", "buy", "require", "urgently need"];

  let sellerHits = 0;
  let buyerHits = 0;

  sellerKeywords.forEach(kw => {
    if (text.toLowerCase().includes(kw)) sellerHits++;
  });

  buyerKeywords.forEach(kw => {
    if (text.toLowerCase().includes(kw)) buyerHits++;
  });

  if (sellerHits > 0) {
    analysis.sellerConfidence = Math.min(0.5 + (sellerHits * 0.15), 0.98);
  }
  if (buyerHits > 0) {
    analysis.buyerConfidence = Math.min(0.5 + (buyerHits * 0.15), 0.98);
  }

  if (analysis.sellerConfidence > analysis.buyerConfidence && analysis.sellerConfidence >= 0.5) {
    analysis.roleIntent = 'seller';
  } else if (analysis.buyerConfidence > analysis.sellerConfidence && analysis.buyerConfidence >= 0.5) {
    analysis.roleIntent = 'buyer';
  }

  if (text.toLowerCase().includes('lahore')) analysis.flags.push('Lahore');
  if (text.toLowerCase().includes('karachi')) analysis.flags.push('Karachi');
  if (text.toLowerCase().includes('islamabad')) analysis.flags.push('Islamabad');
  if (text.toLowerCase().includes('cod') || text.toLowerCase().includes('cash on delivery')) analysis.flags.push('COD');

  return analysis;
}

module.exports = {
  analyzeMessage
};
