const prisma = require('../services/prisma');
const { normalizePhone } = require('../utils/phone');
const env = require('../config/env');

const PROMO_WINDOW_DAYS = 7;

function delegate(name) {
  return prisma[name] || null;
}

function weekAgo() {
  return new Date(Date.now() - PROMO_WINDOW_DAYS * 24 * 60 * 60 * 1000);
}

function tierForScore(score = 0) {
  const value = Number(score || 0);
  if (value >= 50) return 'VIP';
  if (value >= 30) return 'Gold';
  if (value >= 10) return 'Silver';
  return 'Bronze';
}

function uniquePushFirst(list = [], value = '') {
  const clean = String(value || '').trim();
  if (!clean) return list;
  return [clean, ...list.filter((item) => item !== clean)].slice(0, 10);
}

function inferStyle(text = '') {
  const value = String(text || '').toLowerCase();
  if (/sir|please|kindly|thanks|thank you|shukriya|mehrbani/.test(value)) return 'formal';
  if (/bro|bhai|yar|yaar|plz|kro|krdo|chahiye|chaiye/.test(value)) return 'informal';
  if (/[\u0600-\u06FF]/.test(value)) return 'urdu';
  return 'mixed';
}

async function findCustomer(identifier) {
  if (!identifier) return null;
  const value = typeof identifier === 'string' ? identifier : identifier.id || identifier.whatsapp;
  if (typeof identifier === 'object' && identifier.id) return identifier;
  const phone = normalizePhone(value);
  return prisma.customer.findFirst({
    where: phone
      ? { OR: [{ id: String(value) }, { whatsapp: phone }] }
      : { id: String(value) },
    include: { memory: true }
  }).catch((error) => {
    console.error('[zeroTouch:findCustomer]', error);
    return null;
  });
}

async function ensureMemory(customer, seed = {}) {
  const model = delegate('customerMemory');
  if (!model || !customer?.id) return null;
  const currentTier = tierForScore(customer.priorityScore);
  try {
    return model.upsert({
      where: { customerId: customer.id },
      update: {
        communicationStyle: seed.communicationStyle || customer.memory?.communicationStyle || 'mixed',
        preferredPaymentMethod: seed.preferredPaymentMethod || customer.memory?.preferredPaymentMethod || undefined,
        preferredTools: seed.preferredTools || customer.memory?.preferredTools || [],
        scoreTier: currentTier,
        metadata: seed.metadata || customer.memory?.metadata || {}
      },
      create: {
        customerId: customer.id,
        communicationStyle: seed.communicationStyle || 'mixed',
        preferredPaymentMethod: seed.preferredPaymentMethod || null,
        preferredTools: seed.preferredTools || [],
        scoreTier: currentTier,
        metadata: seed.metadata || {}
      }
    });
  } catch (error) {
    console.error('[zeroTouch:ensureMemory]', error);
    return null;
  }
}

async function recordTimelineEvent({ customerId, orderId, eventType, channel = 'whatsapp', summary, sentAt, response, metadata }) {
  const model = delegate('customerTimelineEvent');
  if (!model || !eventType) return null;
  try {
    return model.create({
      data: {
        customerId: customerId || null,
        orderId: orderId || null,
        eventType,
        channel,
        summary: String(summary || eventType).slice(0, 1000),
        sentAt: sentAt || null,
        response: response || null,
        metadata: metadata || {}
      }
    });
  } catch (error) {
    console.error('[zeroTouch:recordTimelineEvent]', error);
    return null;
  }
}

async function hasTimelineEvent({ customerId, orderId, eventType, since }) {
  const model = delegate('customerTimelineEvent');
  if (!model || !eventType) return false;
  try {
    const found = await model.findFirst({
      where: {
        eventType,
        ...(customerId ? { customerId } : {}),
        ...(orderId ? { orderId } : {}),
        ...(since ? { createdAt: { gte: since } } : {})
      }
    });
    return Boolean(found);
  } catch (error) {
    console.error('[zeroTouch:hasTimelineEvent]', error);
    return false;
  }
}

async function updateMemoryAfterMessage(customerPhone, messageText, intent = '') {
  const customer = await findCustomer(customerPhone);
  if (!customer) return null;
  const memory = await ensureMemory(customer);
  if (!memory) return null;
  try {
    return prisma.customerMemory.update({
      where: { customerId: customer.id },
      data: {
        communicationStyle: inferStyle(messageText),
        lastIntent: intent || memory.lastIntent || null,
        metadata: {
          ...(memory.metadata || {}),
          lastMessageSample: String(messageText || '').slice(0, 240)
        }
      }
    });
  } catch (error) {
    console.error('[zeroTouch:updateMemoryAfterMessage]', error);
    return memory;
  }
}

async function updateMemoryAfterOrder(order) {
  const customerId = order?.customerId || order?.customer?.id;
  if (!customerId) return null;
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: { memory: true }
  }).catch(() => null);
  if (!customer) return null;

  const toolSlug = order.tool?.slug || order.toolSlug || '';
  const toolName = order.tool?.name || toolSlug;
  const currentTools = Array.isArray(customer.memory?.preferredTools) ? customer.memory.preferredTools : [];
  const preferredTools = uniquePushFirst(currentTools, toolSlug || toolName);
  const style = customer.memory?.communicationStyle || 'mixed';
  const scoreTier = tierForScore(Number(customer.priorityScore || 0));

  const memory = await ensureMemory(customer, {
    communicationStyle: style,
    preferredPaymentMethod: order.paymentMethod || customer.memory?.preferredPaymentMethod || null,
    preferredTools,
    metadata: {
      ...(customer.memory?.metadata || {}),
      lastPurchaseAmount: Number(order.sellPrice || 0) * Number(order.quantity || 1),
      lastTool: toolSlug || toolName,
      lastPlan: order.plan?.slug || order.planSlug || '',
      lastAccountType: order.accountType?.name || order.accountType || '',
      lastOrderId: order.orderId
    }
  });

  if (memory && delegate('customerMemory')) {
    await prisma.customerMemory.update({
      where: { customerId: customer.id },
      data: {
        preferredTools,
        preferredPaymentMethod: order.paymentMethod || memory.preferredPaymentMethod || null,
        scoreTier,
        metadata: {
          ...(memory.metadata || {}),
          lastPurchaseAmount: Number(order.sellPrice || 0) * Number(order.quantity || 1),
          lastTool: toolSlug || toolName,
          lastPlan: order.plan?.slug || order.planSlug || '',
          lastAccountType: order.accountType?.name || order.accountType || '',
          lastOrderId: order.orderId
        }
      }
    }).catch((error) => console.error('[zeroTouch:updateMemoryAfterOrder:update]', error));
  }

  await recordTimelineEvent({
    customerId: customer.id,
    orderId: order.orderId,
    eventType: 'ORDER_DELIVERED',
    summary: `${toolName} ${order.plan?.name || ''} delivered`,
    metadata: { amount: Number(order.sellPrice || 0), tier: scoreTier }
  });
  await schedulePostDeliveryAutomation(order);
  return memory;
}

async function scheduleAutomationTask({ taskKey, type, customerId, orderId, scheduledAt, payload }) {
  const model = delegate('automationTask');
  if (!model || !taskKey || !type || !scheduledAt) return null;
  try {
    return model.upsert({
      where: { taskKey },
      update: { scheduledAt, payload: payload || {}, status: 'scheduled' },
      create: {
        taskKey,
        type,
        customerId: customerId || null,
        orderId: orderId || null,
        scheduledAt,
        payload: payload || {}
      }
    });
  } catch (error) {
    console.error('[zeroTouch:scheduleAutomationTask]', error);
    return null;
  }
}

async function schedulePostDeliveryAutomation(order) {
  if (!order?.orderId) return [];
  const customerId = order.customerId || order.customer?.id || null;
  const deliveredAt = order.deliveryDate ? new Date(order.deliveryDate) : new Date();
  const renewalAt = order.renewalDate ? new Date(order.renewalDate) : new Date(deliveredAt.getTime() + 30 * 24 * 60 * 60 * 1000);
  const tasks = [
    { suffix: 'review-24h', type: 'review_request', at: new Date(deliveredAt.getTime() + 24 * 60 * 60 * 1000) },
    { suffix: 'upsell-7d', type: 'smart_upsell', at: new Date(deliveredAt.getTime() + 7 * 24 * 60 * 60 * 1000) },
    { suffix: 'renew-7d', type: 'expiry_reminder_7', at: new Date(renewalAt.getTime() - 7 * 24 * 60 * 60 * 1000) },
    { suffix: 'renew-3d', type: 'expiry_reminder_3', at: new Date(renewalAt.getTime() - 3 * 24 * 60 * 60 * 1000) },
    { suffix: 'renew-1d', type: 'expiry_reminder_1', at: new Date(renewalAt.getTime() - 24 * 60 * 60 * 1000) }
  ];
  const saved = [];
  for (const task of tasks) {
    saved.push(await scheduleAutomationTask({
      taskKey: `${order.orderId}:${task.suffix}`,
      type: task.type,
      customerId,
      orderId: order.orderId,
      scheduledAt: task.at,
      payload: { orderId: order.orderId }
    }));
  }
  return saved.filter(Boolean);
}

async function canSendPromotion(customerId) {
  const model = delegate('customerTimelineEvent');
  if (!model || !customerId) return true;
  try {
    const count = await model.count({
      where: {
        customerId,
        eventType: { in: ['PROMO_SENT', 'SMART_UPSELL', 'LOST_CUSTOMER_RECOVERY', 'EVENING_DEAL'] },
        createdAt: { gte: weekAgo() }
      }
    });
    return count < Number(env.zeroTouchPromoLimitPerWeek || 2);
  } catch (error) {
    console.error('[zeroTouch:canSendPromotion]', error);
    return true;
  }
}

async function recordPromotion(customerId, summary, metadata = {}) {
  await recordTimelineEvent({
    customerId,
    eventType: metadata.eventType || 'PROMO_SENT',
    summary,
    sentAt: new Date(),
    metadata
  });
  if (delegate('customerMemory') && customerId) {
    await prisma.customerMemory.update({
      where: { customerId },
      data: {
        lastPromotionalAt: new Date(),
        promotionSentThisWeek: { increment: 1 }
      }
    }).catch(() => null);
  }
}

async function buildCustomerProfile(identifier) {
  const customer = await findCustomer(identifier);
  if (!customer) return null;
  const [orders, memory] = await Promise.all([
    prisma.businessOrder.findMany({
      where: { customerId: customer.id },
      include: { tool: true, plan: true, accountType: true },
      orderBy: { createdAt: 'desc' },
      take: 20
    }),
    ensureMemory(customer)
  ]);
  const preferredTools = Array.isArray(memory?.preferredTools) && memory.preferredTools.length
    ? memory.preferredTools
    : [...new Set(orders.map((order) => order.tool?.slug).filter(Boolean))];
  return {
    customer,
    memory,
    orders,
    preferredTools,
    tier: memory?.scoreTier || tierForScore(customer.priorityScore),
    preferredPaymentMethod: memory?.preferredPaymentMethod || orders.find((order) => order.paymentMethod)?.paymentMethod || null,
    totalRevenue: orders.reduce((sum, order) => sum + Number(order.sellPrice || 0) * Number(order.quantity || 1), 0)
  };
}

module.exports = {
  tierForScore,
  inferStyle,
  ensureMemory,
  recordTimelineEvent,
  hasTimelineEvent,
  updateMemoryAfterMessage,
  updateMemoryAfterOrder,
  scheduleAutomationTask,
  schedulePostDeliveryAutomation,
  canSendPromotion,
  recordPromotion,
  buildCustomerProfile
};
