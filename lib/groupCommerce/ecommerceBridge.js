// lib/groupCommerce/ecommerceBridge.js
// Group Commerce OS - bridge PREVIEWS between groups and the existing ecommerce
// system. Does NOT write real products/orders. Every function returns a draft
// object describing what WOULD be created, gated by GROUP_COMMERCE_ECOMMERCE_WRITE.


'use strict';

const CONFIG = {
  ecommerceWrite: String(process.env.GROUP_COMMERCE_ECOMMERCE_WRITE || 'false') === 'true',
     dryRun: String(process.env.GROUP_COMMERCE_DRY_RUN || 'true') === 'true',
};


function guard() { return { write: CONFIG.ecommerceWrite && !CONFIG.dryRun }; }

// ecommerce product -> group catalogue draft
function productToGroupCatalog(product) {
  return { kind: 'group_catalog_item_draft', preview: true, item: {
    sku: product.sku || null, productName: product.name, price: product.price, currency: product.currency || 'PKR',
stockStatus: product.inStock ? 'in_stock' : 'out_of_stock',


    } };
}
// group seller offer -> internal product draft (NOT written)
function offerToProductDraft(offer) {
  return { kind: 'product_draft', preview: true, wouldWrite: guard().write, product: {
    name: offer.productName, sku: offer.sku || null, price: offer.price, currency: offer.currency || 'PKR', source:
'group_offer',
    }, note: guard().write ? 'would create product' : 'preview only (GROUP_COMMERCE_ECOMMERCE_WRITE=false)' };
}
// group buyer request -> order draft (NOT written)
function buyerToOrderDraft(request) {
    return { kind: 'order_draft', preview: true, wouldWrite: guard().write, order: {
      customerMasked: request.customerMasked || null, productName: request.productName, quantity: request.quantity || 1,
amount: request.price || null, currency: request.currency || 'PKR',
  }, note: guard().write ? 'would create order' : 'preview only' };
}
// group stock update -> ecommerce stock draft
function stockToEcommerceDraft(update) {
  return { kind: 'stock_draft', preview: true, wouldWrite: guard().write, sku: update.sku || null, stockStatus:
update.stockStatus, note: guard().write ? 'would update stock' : 'preview only' };
}
// ecommerce abandoned cart -> group/admin alert draft
function abandonedCartAlertDraft(cart) {
  return { kind: 'admin_alert_draft', preview: true, message: `Abandoned cart: ${cart.productName || 'item'}
(${cart.currency || 'PKR'} ${cart.amount || '?'}) by ${cart.customerMasked || 'customer'}.` };
}
// ecommerce new product -> group/channel post draft
function newProductPostDraft(product) {
  return { kind: 'group_post_draft', preview: true, draft: `New: *${product.name}* ${product.currency || 'PKR'}
${product.price}. DM to order.` };
}


module.exports = { productToGroupCatalog, offerToProductDraft, buyerToOrderDraft, stockToEcommerceDraft,
abandonedCartAlertDraft, newProductPostDraft, CONFIG };
