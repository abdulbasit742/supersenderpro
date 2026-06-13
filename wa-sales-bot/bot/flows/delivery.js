const queries = require('../../db/queries');
const fmt = require('../../utils/formatter');
const { generateInvoiceText } = require('../../utils/invoiceGen');
const { getDeliveryReminder } = require('../../utils/policyChecker');
const stockManager = require('../dealerIntelligence/stockManager');
const n8nBridge = require('../../lib/n8nBridge');

async function approveAndDeliver(runtime, orderId, adminJid) {
  const result = queries.approveOrder(orderId);
  const { order, stocks, alreadyDelivered } = result;

  if (alreadyDelivered) {
    await runtime.sendText(adminJid, `ℹ️ ${orderId} pehle hi deliver ho chuka hai.`);
    return result;
  }

  const invoiceText = generateInvoiceText(order);
  const customerJid = `${order.whatsapp_number}@s.whatsapp.net`;
  stockManager.consumeDeliveredOrder(order, stocks);

  await runtime.sendText(
    customerJid,
    fmt.deliveryMessage(order, stocks, invoiceText, getDeliveryReminder(order.type_name))
  );
  await runtime.sendText(
    adminJid,
    `✅ *${orderId} approved and delivered.*\nCustomer: ${order.customer_name || order.whatsapp_number}\nType: ${order.type_label || order.type_name || 'N/A'}`
  );

  queries.resetConversation(order.whatsapp_number);

  n8nBridge.triggerPaymentVerification({
    orderId: order.order_id,
    customerNumber: order.whatsapp_number,
    customerName: order.customer_name,
    toolSlug: order.tool_slug,
    toolName: order.tool_name,
    planSlug: order.plan_slug,
    planName: order.plan_name,
    accountType: order.type_name,
    accountTypeLabel: order.type_label,
    quantity: Number(order.quantity || 1),
    sellPrice: Number(order.sell_price || 0),
    buyPrice: Number(order.buy_price || 0),
    profit: Number(order.profit || 0),
    deliveredAt: order.delivery_date || new Date().toISOString(),
    paymentVerifiedAt: order.payment_verified_at || new Date().toISOString(),
    status: order.status,
    deliveredCredentialsCount: Array.isArray(stocks) ? stocks.length : 0
  }, {
    channel: 'whatsapp_bot',
    stage: 'payment_verified_and_delivered'
  }).catch(() => {});

  return result;
}

module.exports = {
  approveAndDeliver
};
