// lib/voiceAI/ecommerceVoice.js — Connects ecommerce/order data (passed in) to voice drafts.
// Does NOT rebuild the ecommerce hub; it only consumes plain product/order objects.

const templateRenderer = require('./templateRenderer');

function productExplanation(product = {}, language = 'roman_urdu') {
  return templateRenderer.render('product_info_ru', { product: product.name || 'Product', details: product.description || '' });
}
function orderConfirmation(order = {}) {
  return templateRenderer.render('order_confirm_ru', { product: order.product || 'Item', qty: order.qty || 1, total: order.total || 0, name: order.customerName || 'Customer' });
}
function paymentReminder(order = {}) {
  return templateRenderer.render('payment_pending_ru', { amount: order.amount || 0 });
}
function deliveryUpdate(order = {}) {
  return templateRenderer.render('delivery_update_ru', { status: order.status || 'in transit', date: order.eta || 'soon' });
}
function abandonedCart(cart = {}) {
  return templateRenderer.render('abandoned_cart_ru', { name: cart.customerName || 'Customer', product: cart.product || 'your item' });
}
function flashSale(deal = {}) {
  return templateRenderer.render('ecommerce_deal_ru', { product: deal.product || 'Deal', price: deal.price || 0 });
}

module.exports = { productExplanation, orderConfirmation, paymentReminder, deliveryUpdate, abandonedCart, flashSale };
