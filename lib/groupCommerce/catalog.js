// lib/groupCommerce/catalog.js - Group Catalogs, Stock, and Pricing engine
const store = require('./store');

const mockCatalogs = {
  "group-123": [
    {
      sku: "SKU-IPH13",
      productName: "iPhone 13 128GB",
      latestPrice: 145000,
      minPrice: 140000,
      maxPrice: 147000,
      currency: "PKR",
      stock: 3,
      trustedSellers: ["+923001234567"],
      lastUpdated: new Date().toISOString()
    },
    {
      sku: "SKU-CANVAPRO",
      productName: "Canva Pro 1 Year",
      latestPrice: 1500,
      minPrice: 1200,
      maxPrice: 2000,
      currency: "PKR",
      stock: 45,
      trustedSellers: ["+923129876543"],
      lastUpdated: new Date().toISOString()
    }
  ]
};

function listGroupCatalog(groupId) {
  return mockCatalogs[groupId] || [];
}

function addOrUpdateItem(groupId, item) {
  if (!mockCatalogs[groupId]) {
    mockCatalogs[groupId] = [];
  }

  const existingIndex = mockCatalogs[groupId].findIndex(i => i.sku.toUpperCase() === item.sku.toUpperCase());
  const updatedItem = {
    sku: item.sku.toUpperCase(),
    productName: item.productName || 'Unlabeled Product',
    latestPrice: item.latestPrice || 0,
    minPrice: item.minPrice || item.latestPrice || 0,
    maxPrice: item.maxPrice || item.latestPrice || 0,
    currency: item.currency || 'PKR',
    stock: typeof item.stock === 'number' ? item.stock : 1,
    trustedSellers: item.trustedSellers || [],
    lastUpdated: new Date().toISOString()
  };

  if (existingIndex > -1) {
    const existing = mockCatalogs[groupId][existingIndex];
    updatedItem.minPrice = Math.min(existing.minPrice, updatedItem.latestPrice);
    updatedItem.maxPrice = Math.max(existing.maxPrice, updatedItem.latestPrice);
    updatedItem.trustedSellers = Array.from(new Set([...existing.trustedSellers, ...updatedItem.trustedSellers]));
    mockCatalogs[groupId][existingIndex] = updatedItem;
  } else {
    mockCatalogs[groupId].push(updatedItem);
  }

  return updatedItem;
}

function importFromEcommerce(groupId, storeId) {
  const importedItems = [
    { sku: "SKU-NETFLIX", productName: "Netflix Ultra HD 1 Month", latestPrice: 400, currency: "PKR", stock: 150, trustedSellers: ["E-Commerce Hub"] },
    { sku: "SKU-MACBOOKM1", productName: "MacBook Air M1 8GB", latestPrice: 165000, currency: "PKR", stock: 2, trustedSellers: ["Store Stock"] }
  ];

  importedItems.forEach(item => addOrUpdateItem(groupId, item));
  return { success: true, importedCount: importedItems.length, items: importedItems };
}

function exportToEcommercePreview(groupId) {
  const items = listGroupCatalog(groupId);
  return {
    success: true,
    dryRun: true,
    action: "export_to_ecommerce",
    drafts: items.map(item => ({
      name: item.productName,
      sku: item.sku,
      price: item.latestPrice,
      inventory_quantity: item.stock,
      status: "draft",
      metadata: { synced_from_group: groupId }
    }))
  };
}

function generateWhatsAppGroupCatalogPost(groupId) {
  const items = listGroupCatalog(groupId);
  if (!items || items.length === 0) return "🛍️ Catalog is empty.";

  let post = "🛍️ *TODAY'S MARKETPLACE OFFERS* 🛍️\n";
  post += "Group Code: " + groupId + "\n";
  post += "═══════════════════════════\n\n";

  items.forEach((item, idx) => {
    post += (idx + 1) + ". *" + item.productName + "*\n";
    post += "   SKU: `" + item.sku + "`\n";
    post += "   Price: *Rs. " + item.latestPrice.toLocaleString() + "*\n";
    post += "   Stock: " + item.stock + " available\n";
    post += "   Seller: [Verified Merchant]\n\n";
  });

  post += "═══════════════════════════\n";
  post += "💬 Order format: \"need SKU quantity\" or DM verified sellers.";
  return post;
}

function generateChannelOrSocialCatalogPost(groupId) {
  const items = listGroupCatalog(groupId);
  if (!items || items.length === 0) return "🛍️ Catalog is empty.";

  let post = "📢 *MARKET UPDATE: NEW PRODUCTS SYNCHRONIZED* 📢\n\n";
  items.forEach(item => {
    post += "🔥 *" + item.productName + "* (" + item.sku + ") is now stocked!\n";
    post += "👉 Grab yours today for *Rs. " + item.latestPrice.toLocaleString() + "*.\n";
    post += "📈 Only " + item.stock + " left in active reserve.\n\n";
  });
  post += "⚡ Join our community groups to buy directly from verified merchants. #SuperSenderPro #Marketplace";
  return post;
}

module.exports = {
  listGroupCatalog,
  addOrUpdateItem,
  importFromEcommerce,
  exportToEcommercePreview,
  generateWhatsAppGroupCatalogPost,
  generateChannelOrSocialCatalogPost
};
