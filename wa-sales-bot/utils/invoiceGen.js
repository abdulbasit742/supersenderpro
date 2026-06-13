function generateInvoiceText(order) {
  const total = Number(order.sell_price || 0) * Number(order.quantity || 1);
  return `🧾 *Invoice*\nOrder ID: *${order.order_id}*\nCustomer: *${order.customer_name || order.whatsapp_number}*\nTool: *${order.tool_name} ${order.plan_name}*\nType: *${order.type_label || order.type_name || 'N/A'}*\nQty: *${order.quantity}*\nAmount: *Rs ${total.toLocaleString('en-PK')}*\nStatus: *Paid & Delivered*`;
}

module.exports = {
  generateInvoiceText
};
