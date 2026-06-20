// lib/groupCommerce/ecommerceBridge.js - Integration with E-Commerce Gateways
const catalog = require('./catalog');

const ECOMMERCE_WRITE = process.env.GROUP_COMMERCE_ECOMMERCE_WRITE === 'true';

function syncProductToGroupCatalog(groupId, storeProductId) {
  const sampleProduct = {
    id: storeProductId,
    sku: "SKU-IPAD9",
    name: "Apple iPad 9th Gen 64GB",
    price: 85000,
    stock: 5
  };

  const localItem = {
    sku: sampleProduct.sku,
    productName: sampleProduct.name,
    latestPrice: sampleProduct.price,
    stock: sampleProduct.stock,
    trustedSellers: ["Official Ecom Sync"]
  };

  const added = catalog.addOrUpdateItem(groupId, localItem);
  return {
    success: true,
    action: "product_imported_to_group",
    product: added,
    liveWrite: ECOMMERCE_WRITE
  };
}

function createProductDraft(groupId, sellerOffer) {
  const draft = {
    sku: sellerOffer.sku || 'SKU-DRAFT',
    name: sellerOffer.productName || 'Group Draft Product',
    regular_price: String(sellerOffer.price || '0'),
    stock_quantity: sellerOffer.quantity || 1,
    status: 'draft',
    description: `Synced from Group Commerce OS - Group: ${groupId}. Verified price: ${sellerOffer.price}`
  };

  return {
    success: true,
    dryRun: !ECOMMERCE_WRITE,
    draftSaved: true,
    action: "create_internal_product_draft",
    payload: draft
  };
}

function createOrderDraft(groupId, buyerRequest) {
  const orderDraft = {
    status: 'pending',
    payment_method: 'cod',
    line_items: [
      {
        sku: buyerRequest.sku || 'SKU-UNKNOWN',
        quantity: buyerRequest.quantity || 1,
        name: buyerRequest.productName || 'Group Catalog Product'
      }
    ],
    billing: {
      first_name: "Group Buyer",
      phone: buyerRequest.buyerPhone || "Masked Phone"
    },
    metadata_data: [
      { key: "synced_from_whatsapp_group", value: groupId }
    ]
  };

  return {
    success: true,
    dryRun: !ECOMMERCE_WRITE,
    orderDraftCreated: true,
    action: "create_order_draft",
    payload: orderDraft
  };
}

function syncStockUpdate(groupId, sku, stockAmount) {
  return {
    success: true,
    dryRun: !ECOMMERCE_WRITE,
    action: "update_ecommerce_stock_draft",
    sku,
    newStock: stockAmount,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  syncProductToGroupCatalog,
  createProductDraft,
  createOrderDraft,
  syncStockUpdate
};
