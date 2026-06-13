const fs = require('fs/promises');
const path = require('path');
const prisma = require('../services/prisma');
const env = require('../config/env');
const { normalizePhone } = require('../utils/phone');
const { money, line } = require('../utils/formatter');
const { sendWhatsAppMessage } = require('../whatsapp/baileysClient');
const { checkLowStock } = require('../dealerIntelligence/stockManager');
const { syncAll } = require('../utils/sheetsSync');
const {
  recordTimelineEvent,
  hasTimelineEvent,
  canSendPromotion,
  recordPromotion,
  buildCustomerProfile,
  tierForScore,
  scheduleAutomationTask
} = require('./memory');
const {
  compareDealerPricesHourly,
  buildPricingRecommendations,
  getDynamicAvailability
} = require('./pricing');

function now() {
  return new Date();
}

function dayRangeFromNow(days) {
  const start = new Date();
  start.setDate(start.getDate() + Number(days || 0));
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { gte: start, lt: end };
}

function jid(phone) {
  const normalized = normalizePhone(phone);
  return normalized ? `${normalized}@s.whatsapp.net` : '';
}

async function sendCustomer(customer, message) {
  const to = jid(customer?.whatsapp || customer?.phone || customer);
  if (!to) return { success: false, message: 'Customer number missing' };
  try {
    await sendWhatsAppMessage({ to, sessionKey: env.customerSessionId, message });
    return { success: true };
  } catch (error) {
    console.error('[zeroTouch:sendCustomer]', error);
    return { success: false, message: error.message };
  }
}

async function sendAdmin(message, title = 'Zero-Touch Alert', severity = 'info', payload = {}) {
  await prisma.adminAlert.create({
    data: { type: 'zero_touch', title, message, severity, payload }
  }).catch(() => null);
  if (!env.adminNumber) return { success: false, message: 'ADMIN_NUMBER missing' };
  try {
    await sendWhatsAppMessage({ to: jid(env.adminNumber), sessionKey: env.adminSessionId, message });
    return { success: true };
  } catch (error) {
    console.error('[zeroTouch:sendAdmin]', error);
    return { success: false, message: error.message };
  }
}

function renewalMessage(order, daysLeft, profile = {}) {
  const tool = `${order.tool?.name || ''} ${order.plan?.name || ''}`.trim();
  const tier = profile.tier || tierForScore(order.customer?.priorityScore);
  const discount = tier === 'VIP' ? '\n🎁 VIP discount: 10% automatic apply hoga.' : tier === 'Gold' ? '\n🎁 Gold customer offer: renewal par special bundle available.' : '';
  return [
    `السلام علیکم ${order.customer?.name || ''}`.trim(),
    '',
    `⏰ Aap ka *${tool}* ${daysLeft} din me expire ho raha hai.`,
    `Renew karna ho to reply karein: *renew ${order.orderId}*`,
    discount,
    '',
    'Payment verify hotay hi renewal auto-deliver ho jaye gi.'
  ].filter(Boolean).join('\n');
}

async function sendExpiryReminders(days = [7, 3, 1]) {
  const result = { checked: 0, sent: 0, skipped: 0 };
  for (const day of days) {
    const orders = await prisma.businessOrder.findMany({
      where: { status: 'delivered', renewalDate: dayRangeFromNow(day) },
      include: { customer: { include: { memory: true } }, tool: true, plan: true, accountType: true }
    });
    for (const order of orders) {
      result.checked += 1;
      const eventType = `EXPIRY_REMINDER_${day}D`;
      if (await hasTimelineEvent({ customerId: order.customerId, orderId: order.orderId, eventType })) {
        result.skipped += 1;
        continue;
      }
      const profile = await buildCustomerProfile(order.customerId).catch(() => null);
      const message = renewalMessage(order, day, profile || {});
      const send = await sendCustomer(order.customer, message);
      if (send.success) {
        result.sent += 1;
        await recordTimelineEvent({
          customerId: order.customerId,
          orderId: order.orderId,
          eventType,
          summary: `${day} day renewal reminder sent`,
          sentAt: now(),
          metadata: { daysLeft: day, tier: profile?.tier || 'Bronze' }
        });
      }
    }
  }
  return result;
}

async function sendSmartUpsells() {
  const start = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
  const end = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
  const chatgptOrders = await prisma.businessOrder.findMany({
    where: {
      status: 'delivered',
      deliveryDate: { gte: start, lte: end },
      tool: { slug: 'chatgpt' }
    },
    include: { customer: { include: { memory: true } }, tool: true, plan: true }
  });
  const result = { checked: chatgptOrders.length, sent: 0 };
  for (const order of chatgptOrders) {
    const eventType = 'SMART_UPSELL_CLAUDE_AFTER_CHATGPT';
    if (await hasTimelineEvent({ customerId: order.customerId, eventType, since: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) })) continue;
    if (!(await canSendPromotion(order.customerId))) continue;
    const message = [
      `Hi ${order.customer.name || ''}`.trim(),
      '',
      'Aap ChatGPT use kar rahe hain, is liye Claude Pro bhi kaafi useful ho sakta hai:',
      '✅ long documents',
      '✅ coding + research',
      '✅ business writing',
      '',
      'Bundle price chahiye ho to reply karein: *Claude bundle*'
    ].join('\n');
    const send = await sendCustomer(order.customer, message);
    if (send.success) {
      result.sent += 1;
      await recordPromotion(order.customerId, 'Claude upsell after ChatGPT purchase', { eventType: 'SMART_UPSELL', orderId: order.orderId, targetTool: 'claude' });
    }
  }
  return result;
}

async function recoverFailedPayments() {
  const pending = await prisma.businessOrder.findMany({
    where: { status: { in: ['awaiting_payment', 'payment_pending', 'awaiting_verification'] } },
    include: { customer: true, tool: true, plan: true, accountType: true },
    orderBy: { createdAt: 'asc' },
    take: 200
  });
  const result = { checked: pending.length, sent: 0, expired: 0 };
  const ageMs = (date) => Date.now() - new Date(date).getTime();

  for (const order of pending) {
    const age = ageMs(order.createdAt);
    let eventType = '';
    let message = '';
    if (age >= 48 * 60 * 60 * 1000) {
      eventType = 'PAYMENT_SLOT_RELEASED_48H';
      message = `Order *${order.orderId}* ka reserved slot release kar diya gaya hai. Agar abhi bhi chahiye ho to *order* reply karein.`;
    } else if (age >= 24 * 60 * 60 * 1000) {
      eventType = 'PAYMENT_RECOVERY_24H';
      message = `Order *${order.orderId}* abhi pending hai. Last chance: slot 2 ghantay aur reserved rahe ga. Payment guide chahiye ho to reply *help*.`;
    } else if (age >= 2 * 60 * 60 * 1000) {
      eventType = 'PAYMENT_RECOVERY_2H';
      message = `Kya aap ne *${order.orderId}* ki payment complete kar di? Screenshot ya TXN ID yahin send karein. JazzCash/Easypaisa/Bank details dobara chahiye hon to *payment* likhein.`;
    }
    if (!eventType || await hasTimelineEvent({ customerId: order.customerId, orderId: order.orderId, eventType })) continue;
    const send = await sendCustomer(order.customer, message);
    if (send.success) {
      result.sent += 1;
      await recordTimelineEvent({ customerId: order.customerId, orderId: order.orderId, eventType, summary: eventType, sentAt: now(), metadata: { ageHours: Math.round(age / 3600000) } });
      if (eventType === 'PAYMENT_SLOT_RELEASED_48H') {
        await prisma.businessOrder.update({ where: { orderId: order.orderId }, data: { status: 'expired', notes: 'Auto released after 48h without payment.' } }).catch(() => null);
        result.expired += 1;
      }
    }
  }
  return result;
}

async function recoverLostCustomers() {
  const cut60 = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  const cut30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const customers = await prisma.customer.findMany({
    where: {
      scammerFlag: false,
      lastOrder: { lte: cut30 }
    },
    include: { memory: true },
    orderBy: { lastOrder: 'asc' },
    take: 200
  });
  const result = { checked: customers.length, sent: 0 };
  for (const customer of customers) {
    if (!(await canSendPromotion(customer.id))) continue;
    const phase = new Date(customer.lastOrder || customer.createdAt) <= cut60 ? '60D' : '30D';
    const eventType = `LOST_CUSTOMER_RECOVERY_${phase}`;
    if (await hasTimelineEvent({ customerId: customer.id, eventType, since: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000) })) continue;
    const tool = Array.isArray(customer.memory?.preferredTools) && customer.memory.preferredTools[0] ? customer.memory.preferredTools[0] : 'ChatGPT';
    const message = phase === '60D'
      ? `Aap ko dekhe huay kaafi time ho gaya. Comeback offer: ${tool} renewal/order par special discount. Reply *offer* for details.`
      : `We miss you 🙂 ${tool} ya AI tools ka koi plan chahiye ho to aaj special rate mil sakta hai. Reply *price*.`;
    const send = await sendCustomer(customer, message);
    if (send.success) {
      result.sent += 1;
      await recordPromotion(customer.id, eventType, { eventType: 'LOST_CUSTOMER_RECOVERY', phase, preferredTool: tool });
    }
  }
  return result;
}

async function sendReviewRequests() {
  const start = new Date(Date.now() - 36 * 60 * 60 * 1000);
  const end = new Date(Date.now() - 20 * 60 * 60 * 1000);
  const orders = await prisma.businessOrder.findMany({
    where: { status: 'delivered', deliveryDate: { gte: start, lte: end } },
    include: { customer: true, tool: true, plan: true }
  });
  const result = { checked: orders.length, sent: 0 };
  for (const order of orders) {
    const eventType = 'REVIEW_REQUEST_24H';
    if (await hasTimelineEvent({ customerId: order.customerId, orderId: order.orderId, eventType })) continue;
    const message = [
      `Order *${order.orderId}*`,
      `Aap ka ${order.tool.name} ${order.plan.name} account kaisa chal raha hai? ⭐`,
      '',
      'Agar sab theek hai to short review/screenshot share kar dein.',
      'Agar issue hai to yahin reply karein, admin ko immediately alert ho jaye ga.'
    ].join('\n');
    const send = await sendCustomer(order.customer, message);
    if (send.success) {
      result.sent += 1;
      await recordTimelineEvent({ customerId: order.customerId, orderId: order.orderId, eventType, summary: 'Review request sent', sentAt: now() });
    }
  }
  return result;
}

async function refreshStockAndPrices() {
  const [lowStock, pricing] = await Promise.all([
    checkLowStock(),
    compareDealerPricesHourly()
  ]);
  return { lowStockCount: lowStock.length, pricing };
}

function groupedByPreferredTool(customers) {
  const groups = new Map();
  for (const customer of customers) {
    const tool = Array.isArray(customer.memory?.preferredTools) && customer.memory.preferredTools[0]
      ? customer.memory.preferredTools[0]
      : 'general';
    const list = groups.get(tool) || [];
    list.push(customer);
    groups.set(tool, list);
  }
  return groups;
}

async function sendSegmentedEveningDeals() {
  const customers = await prisma.customer.findMany({
    where: { scammerFlag: false, totalOrders: { gt: 0 } },
    include: { memory: true },
    take: 300,
    orderBy: [{ isVip: 'desc' }, { lastOrder: 'desc' }]
  });
  const recommendations = await buildPricingRecommendations();
  const recByTool = new Map(recommendations.map((row) => [row.toolSlug, row]));
  const groups = groupedByPreferredTool(customers);
  const result = { checked: customers.length, sent: 0, skipped: 0, failed: 0 };

  for (const [tool, list] of groups.entries()) {
    const rec = recByTool.get(tool) || recommendations[0];
    if (!rec) continue;
    for (const customer of list) {
      if (!(await canSendPromotion(customer.id))) {
        result.skipped += 1;
        continue;
      }
      const tier = customer.memory?.scoreTier || tierForScore(customer.priorityScore);
      const message = [
        `Hi ${customer.name || ''}`.trim(),
        '',
        `Aaj ki relevant deal: *${rec.toolName} ${rec.planName}*`,
        `Price: ${money(rec.sellPrice)}`,
        tier === 'VIP' ? 'VIP customer ke liye 10% discount already apply ho sakta hai.' : '',
        '',
        'Order karna ho to reply karein: *order*'
      ].filter(Boolean).join('\n');
      const send = await sendCustomer(customer, message);
      if (send.success) {
        result.sent += 1;
        await recordPromotion(customer.id, 'Segmented evening deal sent', { eventType: 'EVENING_DEAL', toolSlug: rec.toolSlug, planSlug: rec.planSlug });
      } else {
        result.failed += 1;
        await recordTimelineEvent({ customerId: customer.id, eventType: 'BROADCAST_FAILED_OR_BLOCKED', summary: send.message || 'Send failed', metadata: { toolSlug: rec.toolSlug } });
      }
    }
  }
  return result;
}

async function generateDailySummary() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const [orders, lowStock, expiringTomorrow, recommendations] = await Promise.all([
    prisma.businessOrder.findMany({ where: { createdAt: { gte: start } }, include: { tool: true } }),
    prisma.stockInventory.findMany({ where: { quantityAvailable: { lte: env.lowStockThreshold } }, take: 20 }),
    prisma.businessOrder.count({ where: { status: 'delivered', renewalDate: dayRangeFromNow(1) } }),
    buildPricingRecommendations()
  ]);
  const delivered = orders.filter((order) => order.status === 'delivered');
  const revenue = orders.reduce((sum, order) => sum + Number(order.sellPrice || 0) * Number(order.quantity || 1), 0);
  const profit = orders.reduce((sum, order) => sum + Number(order.profit || 0), 0);
  const topTool = [...orders.reduce((map, order) => {
    const key = order.tool?.name || 'Unknown';
    map.set(key, (map.get(key) || 0) + Number(order.quantity || 1));
    return map;
  }, new Map()).entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
  const best = recommendations[0];
  return {
    orders: orders.length,
    delivered: delivered.length,
    revenue,
    profit,
    topTool,
    lowStock,
    expiringTomorrow,
    bestSuggestion: best
  };
}

async function sendDailyZeroTouchSummary() {
  const summary = await generateDailySummary();
  const message = [
    line(),
    '📊 *Zero-Touch Daily Report*',
    '',
    `Aaj orders: ${summary.orders}`,
    `Delivered: ${summary.delivered}`,
    `Revenue: ${money(summary.revenue)}`,
    `Profit: ${money(summary.profit)}`,
    `Top tool: ${summary.topTool}`,
    `Low stock items: ${summary.lowStock.length}`,
    `Kal expire honay walay accounts: ${summary.expiringTomorrow}`,
    summary.bestSuggestion ? `Suggestion: ${summary.bestSuggestion.toolName} buy ${money(summary.bestSuggestion.buyPrice)} sell ${money(summary.bestSuggestion.sellPrice)} margin ${summary.bestSuggestion.marginPct}%` : '',
    '',
    'System autopilot chal raha hai: renewals, recovery, stock alerts, aur smart follow-ups active hain.',
    line()
  ].filter(Boolean).join('\n');
  await sendAdmin(message, 'Zero-Touch daily summary', 'info', summary);
  return summary;
}

async function backupDatabaseAndPlanTomorrow() {
  const result = { backup: 'skipped', tasks: 0 };
  try {
    const databaseUrl = String(process.env.DATABASE_URL || '');
    if (databaseUrl.startsWith('file:')) {
      const dbFile = databaseUrl.replace(/^file:/, '');
      const source = path.isAbsolute(dbFile) ? dbFile : path.join(process.cwd(), dbFile);
      const backupDir = path.join(process.cwd(), 'backups');
      await fs.mkdir(backupDir, { recursive: true });
      const target = path.join(backupDir, `ai-tools-${new Date().toISOString().slice(0, 10)}.sqlite`);
      await fs.copyFile(source, target);
      result.backup = target;
    } else {
      result.backup = 'postgres-volume-managed';
    }
  } catch (error) {
    result.backup = `failed: ${error.message}`;
    console.error('[zeroTouch:backup]', error);
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(8, 0, 0, 0);
  const tasks = [
    ['tomorrow-expiry', 'expiry_reminders', 8],
    ['tomorrow-pricing', 'stock_and_pricing_refresh', 10],
    ['tomorrow-recovery', 'pending_payment_recovery', 12],
    ['tomorrow-summary', 'daily_zero_touch_summary', 21]
  ];
  for (const [suffix, type, hour] of tasks) {
    const scheduledAt = new Date(tomorrow);
    scheduledAt.setHours(hour, 0, 0, 0);
    const saved = await scheduleAutomationTask({
      taskKey: `${scheduledAt.toISOString().slice(0, 10)}:${suffix}`,
      type,
      scheduledAt,
      payload: { source: 'daily_planner' }
    });
    if (saved) result.tasks += 1;
  }
  await sendAdmin(`🗂 Zero-Touch 11 PM close\nBackup: ${result.backup}\nTomorrow tasks prepared: ${result.tasks}`, 'Zero-Touch backup/planner', 'info', result);
  return result;
}

async function runDueAutomationTasks() {
  const model = prisma.automationTask;
  if (!model) return { processed: 0 };
  const due = await model.findMany({
    where: { status: 'scheduled', scheduledAt: { lte: now() } },
    orderBy: { scheduledAt: 'asc' },
    take: 100
  }).catch(() => []);
  let processed = 0;
  for (const task of due) {
    await model.update({ where: { id: task.id }, data: { status: 'running', attempts: { increment: 1 } } }).catch(() => null);
    try {
      await runZeroTouchJob(task.type, task.payload || {});
      await model.update({ where: { id: task.id }, data: { status: 'done', executedAt: now(), lastError: null } }).catch(() => null);
      processed += 1;
    } catch (error) {
      console.error('[zeroTouch:runDueAutomationTasks]', error);
      await model.update({ where: { id: task.id }, data: { status: 'failed', lastError: error.message } }).catch(() => null);
    }
  }
  return { processed };
}

async function runZeroTouchJob(type, payload = {}, io = null) {
  let result;
  switch (type) {
    case 'expiry_reminders':
      result = await sendExpiryReminders(payload.days || [7, 3, 1]);
      break;
    case 'expiry_reminder_7':
      result = await sendExpiryReminders([7]);
      break;
    case 'expiry_reminder_3':
      result = await sendExpiryReminders([3]);
      break;
    case 'expiry_reminder_1':
      result = await sendExpiryReminders([1]);
      break;
    case 'smart_upsell':
      result = await sendSmartUpsells();
      break;
    case 'pending_payment_recovery':
      result = await recoverFailedPayments();
      break;
    case 'lost_customer_recovery':
      result = await recoverLostCustomers();
      break;
    case 'review_request':
      result = await sendReviewRequests();
      break;
    case 'stock_and_pricing_refresh':
      result = await refreshStockAndPrices();
      break;
    case 'segmented_evening_deals':
      result = await sendSegmentedEveningDeals();
      break;
    case 'daily_zero_touch_summary':
      result = await sendDailyZeroTouchSummary();
      break;
    case 'backup_and_plan':
      result = await backupDatabaseAndPlanTomorrow();
      break;
    case 'sheets_sync':
      result = await syncAll();
      break;
    case 'run_due_tasks':
      result = await runDueAutomationTasks();
      break;
    default:
      throw new Error(`Unknown Zero-Touch job: ${type}`);
  }
  io?.emit('zero-touch:job', { type, payload, result, at: new Date().toISOString() });
  return result;
}

async function zeroTouchSummary() {
  const [daily, dynamicAvailability, tasks] = await Promise.all([
    generateDailySummary(),
    getDynamicAvailability().catch(() => []),
    prisma.automationTask ? prisma.automationTask.groupBy({ by: ['status'], _count: { status: true } }).catch(() => []) : []
  ]);
  return { daily, dynamicAvailability, tasks };
}

module.exports = {
  sendExpiryReminders,
  sendSmartUpsells,
  recoverFailedPayments,
  recoverLostCustomers,
  sendReviewRequests,
  refreshStockAndPrices,
  sendSegmentedEveningDeals,
  sendDailyZeroTouchSummary,
  backupDatabaseAndPlanTomorrow,
  runDueAutomationTasks,
  runZeroTouchJob,
  zeroTouchSummary,
  sendAdmin
};
