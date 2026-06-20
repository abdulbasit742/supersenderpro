// lib/groupCommerce/orderBook.js - Per-group Order Draft Tracking
const store = require('./store');
const catalog = require('./catalog');

// In-memory order book keyed by groupId (dry-run drafts only)
const books = {};

const STATUSES = ['draft', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'];

function createOrder(groupId, order) {
  if (!books[groupId]) books[groupId] = [];
  const item = (catalog.listGroupCatalog(groupId) || []).find(
    i => order.sku && i.sku.toUpperCase() === String(order.sku).toUpperCase()
  );
  const newOrder = {
    orderId: 'ord-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
    groupId,
    sku: order.sku || (item ? item.sku : 'SKU-UNKNOWN'),
    productName: order.productName || (item ? item.productName : 'Unknown Product'),
    quantity: order.quantity || 1,
    unitPrice: order.unitPrice || (item ? item.latestPrice : 0),
    currency: order.currency || 'PKR',
    buyer: store.maskPhoneNumber(order.buyer || ''),
    status: 'draft',
    dryRun: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  newOrder.total = newOrder.unitPrice * newOrder.quantity;
  books[groupId].unshift(newOrder);
  return newOrder;
}

function listOrders(groupId) {
  return books[groupId] || [];
}

function updateStatus(groupId, orderId, status) {
  if (!STATUSES.includes(status)) {
    return { success: false, error: 'Invalid status. Allowed: ' + STATUSES.join(', ') };
  }
  const list = books[groupId] || [];
  const order = list.find(o => o.orderId === orderId);
  if (!order) return { success: false, error: 'Order not found' };
  order.status = status;
  order.updatedAt = new Date().toISOString();
  return { success: true, order };
}

function summary(groupId) {
  const list = books[groupId] || [];
  const byStatus = {};
  STATUSES.forEach(s => { byStatus[s] = 0; });
  let revenue = 0;
  list.forEach(o => {
    byStatus[o.status] = (byStatus[o.status] || 0) + 1;
    if (o.status !== 'cancelled') revenue += o.total;
  });
  return { success: true, groupId, totalOrders: list.length, byStatus, projectedRevenue: revenue };
}

module.exports = { createOrder, listOrders, updateStatus, summary, STATUSES };
