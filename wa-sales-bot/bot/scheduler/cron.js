const cron = require('node-cron');
const queries = require('../../db/queries');
const fmt = require('../../utils/formatter');
const { daysBetween, buildFollowupMessage } = require('../flows/followup');
const { sendDailyPriceIntelligence, sendDealerRestockAlerts } = require('../schedulers/dealerCron');
const n8nBridge = require('../../lib/n8nBridge');

async function sendDailyCheapestSummary(runtime) {
  const adminJid = runtime.adminJid();
  if (!adminJid) return;
  const rates = queries.getBestRatesForWindow(24);
  if (!rates.length) return;
  await runtime.sendText(adminJid, `📉 *Best dealer rates from last 24h*\n\n${fmt.bestRatesAdmin(queries.getAllTodayRates())}`);
}

async function sendDailyBroadcast(runtime) {
  const offers = queries.getAvailabilitySnapshot();
  if (!offers.length) return;
  const message = fmt.formatDailyRates(offers);
  const result = await runtime.broadcastToCustomerGroups(message);
  const row = queries.saveBroadcast({
    message,
    targetGroups: runtime.config.customerGroups,
    scheduledTime: '09:00',
    sentAt: new Date().toISOString(),
    status: result.failed.length ? 'partial' : 'sent'
  });
  n8nBridge.triggerDailyBroadcast({
    broadcastId: row?.id || null,
    scheduledTime: '09:00',
    targetGroups: runtime.config.customerGroups,
    sentGroups: result.sent || [],
    failedGroups: result.failed || [],
    status: result.failed.length ? 'partial' : 'sent',
    message
  }, {
    channel: 'cron',
    stage: 'daily_broadcast_sent'
  }).catch(() => {});
}

async function sendSalesSummary(runtime) {
  const adminJid = runtime.adminJid();
  if (!adminJid) return;
  await runtime.sendText(adminJid, fmt.salesStats(queries.getTodaySalesStats()));
}

async function sendLowStockAlerts(runtime) {
  const rows = queries.getStockSummary().filter(row => Number(row.available || 0) < Number(runtime.config.lowStockThreshold));
  if (!rows.length) return;
  const message = fmt.lowStockAlert(rows);
  const adminJid = runtime.adminJid();
  if (adminJid) {
    await runtime.sendText(adminJid, message);
  }
  await runtime.broadcastToCustomerGroups(`🔥 Limited slots alert\n\n${message}`);
}

async function sendAfterSaleFollowups(runtime) {
  const orders = queries.getOrdersForFollowup();
  for (const order of orders) {
    const customerJid = `${order.whatsapp_number}@s.whatsapp.net`;
    const deliveredBase = order.delivery_date || order.payment_verified_at || order.order_date;
    const days = daysBetween(new Date(), deliveredBase);
    const renewalDaysLeft = daysBetween(order.renewal_date, new Date());

    if (order.type_name === 'warranty' && days >= 1 && !order.day1_followup_at) {
      await runtime.sendText(customerJid, buildFollowupMessage(order, 'day1'));
      queries.markFollowupSent(order.order_id, 'day1_followup_at');
      n8nBridge.triggerFollowupSequence({
        orderId: order.order_id,
        customerNumber: order.whatsapp_number,
        customerName: order.customer_name,
        toolSlug: order.tool_slug,
        planSlug: order.plan_slug,
        followupType: 'day1',
        sentAt: new Date().toISOString()
      }, {
        channel: 'cron',
        stage: 'followup_sent'
      }).catch(() => {});
      continue;
    }

    if (days >= 3 && !order.review_requested_at) {
      await runtime.sendText(customerJid, buildFollowupMessage(order, 'review'));
      queries.markFollowupSent(order.order_id, 'review_requested_at');
      n8nBridge.triggerFollowupSequence({
        orderId: order.order_id,
        customerNumber: order.whatsapp_number,
        customerName: order.customer_name,
        toolSlug: order.tool_slug,
        planSlug: order.plan_slug,
        followupType: 'review',
        sentAt: new Date().toISOString()
      }, {
        channel: 'cron',
        stage: 'followup_sent'
      }).catch(() => {});
      continue;
    }

    if (renewalDaysLeft <= 5 && renewalDaysLeft > 2 && !order.day25_reminder_at) {
      await runtime.sendText(customerJid, buildFollowupMessage(order, 'renewal'));
      queries.markFollowupSent(order.order_id, 'day25_reminder_at');
      n8nBridge.triggerFollowupSequence({
        orderId: order.order_id,
        customerNumber: order.whatsapp_number,
        customerName: order.customer_name,
        toolSlug: order.tool_slug,
        planSlug: order.plan_slug,
        followupType: 'renewal',
        sentAt: new Date().toISOString()
      }, {
        channel: 'cron',
        stage: 'followup_sent'
      }).catch(() => {});
      continue;
    }

    if (renewalDaysLeft <= 2 && !order.day28_urgency_at) {
      await runtime.sendText(customerJid, buildFollowupMessage(order, 'urgency'));
      queries.markFollowupSent(order.order_id, 'day28_urgency_at');
      n8nBridge.triggerFollowupSequence({
        orderId: order.order_id,
        customerNumber: order.whatsapp_number,
        customerName: order.customer_name,
        toolSlug: order.tool_slug,
        planSlug: order.plan_slug,
        followupType: 'urgency',
        sentAt: new Date().toISOString()
      }, {
        channel: 'cron',
        stage: 'followup_sent'
      }).catch(() => {});
    }
  }
}

function startCronJobs(runtime) {
  const timezone = runtime.config.timezone;

  cron.schedule('0 8 * * *', () => sendDailyPriceIntelligence(runtime).catch(console.error), { timezone });
  cron.schedule('30 8 * * *', () => sendDailyCheapestSummary(runtime).catch(console.error), { timezone });
  cron.schedule('0 9 * * *', () => sendDailyBroadcast(runtime).catch(console.error), { timezone });
  cron.schedule('0 18 * * *', () => sendSalesSummary(runtime).catch(console.error), { timezone });
  cron.schedule('0 */2 * * *', () => sendLowStockAlerts(runtime).catch(console.error), { timezone });
  cron.schedule('15 */3 * * *', () => sendDealerRestockAlerts(runtime).catch(console.error), { timezone });
  cron.schedule('0 * * * *', () => sendAfterSaleFollowups(runtime).catch(console.error), { timezone });
  cron.schedule('0 14 * * *', () => {
    const delayMs = (Math.floor(Math.random() * 180) + 1) * 60 * 1000;
    setTimeout(() => {
      runtime.broadcastToCustomerGroups('⚡ Flash sale check-in\nAaj ki limited slots aur latest prices ke liye *1* ya *2* reply karein.').catch(console.error);
    }, delayMs);
  }, { timezone });
}

module.exports = {
  startCronJobs
};
