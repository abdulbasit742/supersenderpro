const prisma = require('./prisma');
const env = require('../config/env');
const { sendWhatsAppMessage } = require('../whatsapp/baileysClient');
const { deliveryMessage } = require('../whatsapp/messageTemplates');
const { decrementStock } = require('../dealerIntelligence/stockManager');
const { decryptJson } = require('../security/encryption');
const { auditLog } = require('./auditLog');
const { syncSales, syncStock } = require('../utils/sheetsSync');
const { triggerWorkflow } = require('./n8nClient');
const { updateMemoryAfterOrder } = require('../zeroTouch/memory');

function orderTotal(order) {
  return Number(order.sellPrice || 0) * Number(order.quantity || 1);
}

function stockKeyCredentials(stockKey) {
  if (!stockKey) return {};
  const fallback = stockKey.credentials && stockKey.credentials.encrypted !== true ? stockKey.credentials : {};
  return decryptJson(stockKey.credentialsEncrypted, fallback);
}

async function createWarrantyIfNeeded(order) {
  const type = order.accountType?.name || '';
  if (type !== 'warranty') return null;
  const expiryDate = order.renewalDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  return prisma.warranty.upsert({
    where: { orderId: order.orderId },
    update: { expiryDate, status: 'active' },
    create: {
      orderId: order.orderId,
      expiryDate,
      replacementCount: order.warrantyReplacementsUsed || 0,
      issueCount: order.warrantyIssuesResolved || 0,
      status: 'active'
    }
  }).catch((error) => {
    console.error('[delivery:createWarrantyIfNeeded]', error);
    return null;
  });
}

async function updateCustomerPriority(order) {
  const total = orderTotal(order);
  const current = await prisma.customer.findUnique({ where: { id: order.customerId } }).catch(() => null);
  const nextScore = Number(current?.priorityScore || 0) + 10;
  return prisma.customer.update({
    where: { id: order.customerId },
    data: {
      totalOrders: { increment: 1 },
      totalSpent: { increment: total },
      firstOrder: current?.firstOrder || new Date(),
      lastOrder: new Date(),
      priorityScore: { increment: 10 },
      isVip: nextScore >= 50
    }
  }).catch((error) => {
    console.error('[delivery:updateCustomerPriority]', error);
    return null;
  });
}

async function deliverOrder(orderId, options = {}) {
  const {
    actor = 'system',
    source = 'manual',
    payment = {}
  } = options;

  const order = await prisma.businessOrder.findUnique({
    where: { orderId },
    include: { customer: true, tool: true, plan: true, accountType: true }
  });
  if (!order) return { success: false, message: `Order not found: ${orderId}` };
  if (order.status === 'delivered') return { success: true, alreadyDelivered: true, order, message: `${orderId} already delivered.` };

  const accountType = order.accountType?.name || 'private';
  const stockKey = await prisma.stockKey.findFirst({
    where: {
      toolSlug: order.tool.slug,
      planSlug: order.plan.slug,
      accountType,
      isUsed: false
    },
    orderBy: { addedDate: 'asc' }
  });

  if (!stockKey) {
    await prisma.adminAlert.create({
      data: {
        type: 'delivery_blocked',
        title: `No stock key for ${order.orderId}`,
        message: `${order.tool.name} ${order.plan.name} ${accountType} has no unused encrypted credentials.`,
        severity: 'danger',
        payload: { orderId: order.orderId, tool: order.tool.slug, plan: order.plan.slug, accountType, source }
      }
    }).catch(() => null);
    return { success: false, code: 'NO_STOCK_KEY', message: `Stock key not available for ${order.tool.name} ${order.plan.name} ${accountType}` };
  }

  const credentials = stockKeyCredentials(stockKey);
  if (!credentials || Object.keys(credentials).length === 0) {
    return { success: false, code: 'EMPTY_CREDENTIALS', message: `Stock key ${stockKey.id} has no usable credentials.` };
  }

  await sendWhatsAppMessage({
    to: `${order.customer.whatsapp}@s.whatsapp.net`,
    sessionKey: env.customerSessionId,
    message: deliveryMessage(order.orderId, credentials, `${order.tool.name} ${order.plan.name}`)
  });

  const stockResult = await decrementStock(order.tool.slug, accountType, order.quantity || 1, order.plan.slug);
  const data = {
    status: 'delivered',
    paymentVerifiedAt: payment.paymentVerifiedAt || new Date(),
    deliveryDate: new Date(),
    paymentMethod: payment.paymentMethod || order.paymentMethod,
    paymentTxnHash: payment.paymentTxnHash || order.paymentTxnHash,
    paymentTxnLast4: payment.paymentTxnLast4 || order.paymentTxnLast4,
    paymentSenderNumber: payment.paymentSenderNumber || order.paymentSenderNumber,
    paymentReceivedAt: payment.paymentReceivedAt || order.paymentReceivedAt
  };

  const [updated] = await Promise.all([
    prisma.businessOrder.update({
      where: { orderId: order.orderId },
      data,
      include: { customer: true, tool: true, plan: true, accountType: true }
    }),
    prisma.stockKey.update({ where: { id: stockKey.id }, data: { isUsed: true, usedByOrderId: order.orderId } }),
    updateCustomerPriority(order),
    createWarrantyIfNeeded(order),
    auditLog({
      actor,
      action: 'account_delivery',
      entity: 'BusinessOrder',
      entityId: order.orderId,
      metadata: { source, stockKeyId: stockKey.id, stockResult }
    })
  ]);

  if (!stockResult.success) {
    await prisma.adminAlert.create({
      data: {
        type: 'stock_decrement_failed',
        title: `Stock decrement failed for ${order.orderId}`,
        message: stockResult.message,
        severity: 'danger',
        payload: { orderId: order.orderId, stockResult }
      }
    }).catch(() => null);
  }

  syncSales().catch((error) => console.error('[delivery:syncSales]', error));
  syncStock().catch((error) => console.error('[delivery:syncStock]', error));
  triggerWorkflow('payment_verification', updated).catch((error) => console.error('[delivery:n8n]', error));
  updateMemoryAfterOrder(updated).catch((error) => console.error('[delivery:zeroTouchMemory]', error));

  if (env.adminNumber) {
    const remaining = stockResult.stock?.quantityAvailable ?? 'unknown';
    sendWhatsAppMessage({
      to: `${env.adminNumber}@s.whatsapp.net`,
      sessionKey: env.adminSessionId,
      message: `✅ Delivered ${updated.orderId}\nCustomer: ${updated.customer.whatsapp}\nStock left: ${remaining}\nSource: ${source}`
    }).catch((error) => console.error('[delivery:adminNotice]', error));
  }

  return { success: true, order: updated, stockKeyId: stockKey.id, stock: stockResult.stock || null, stockResult };
}

module.exports = {
  deliverOrder,
  stockKeyCredentials
};
