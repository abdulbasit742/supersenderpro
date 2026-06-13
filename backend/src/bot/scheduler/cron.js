const cron = require('node-cron');
const env = require('../../config/env');
const { sendWhatsAppMessage } = require('../../whatsapp/baileysClient');
const { getDailyPriceSummary } = require('../../services/priceAnalytics');
const { formatPriceReport } = require('../../utils/formatter');
const { buildDailyRateMessage } = require('../../whatsapp/messageTemplates');
const waSender = require('../../whatsapp/waSenderIntegration');
const { sendDailyReport } = require('../../adminSystem/alerts');
const { checkLowStock } = require('../../dealerIntelligence/stockManager');
const { checkTrustThreshold } = require('../../dealerIntelligence/trustManager');
const { syncAll } = require('../../utils/sheetsSync');
const { sendFollowupForDay } = require('../flows/followup');
const prisma = require('../../services/prisma');
const { startZeroTouchQueue, enqueueZeroTouchJob } = require('../../zeroTouch/queue');

function scheduleAll(io) {
  const jobs = [];
  const zone = 'Asia/Karachi';
  startZeroTouchQueue(io);
  const dispatchZeroTouch = (type, payload = {}, options = {}) => enqueueZeroTouchJob(type, payload, options, io);

  jobs.push(cron.schedule('0 8 * * *', async () => {
    try {
      await dispatchZeroTouch('expiry_reminders', { days: [7, 3, 1] });
    } catch (error) {
      console.error('[cron:zeroTouch:800]', error);
    }
  }, { timezone: zone }));

  jobs.push(cron.schedule('30 8 * * *', async () => {
    try {
      const summary = await getDailyPriceSummary();
      io?.emit('price:intelligence', { summary, at: new Date().toISOString() });
    } catch (error) {
      console.error('[cron:830]', error);
    }
  }, { timezone: zone }));

  jobs.push(cron.schedule('0 9 * * *', async () => {
    try {
      const message = formatPriceReport(await getDailyPriceSummary());
      if (env.adminNumber) await sendWhatsAppMessage({ to: `${env.adminNumber}@s.whatsapp.net`, message, sessionKey: env.adminSessionId });
    } catch (error) {
      console.error('[cron:900]', error);
    }
  }, { timezone: zone }));

  jobs.push(cron.schedule('0 10 * * *', async () => {
    try {
      await dispatchZeroTouch('stock_and_pricing_refresh');
      const summary = await getDailyPriceSummary();
      const message = buildDailyRateMessage(summary.map((row) => ({
        tool: `${row.tool} ${row.plan}`.trim(),
        price: row.highest?.price || row.average || row.lowest?.price || 0
      })));
      await waSender.broadcastToGroups(message, env.customerGroups, { campaignName: 'Daily AI Tools Rates', sessionKey: env.customerSessionId });
    } catch (error) {
      console.error('[cron:1000]', error);
    }
  }, { timezone: zone }));

  jobs.push(cron.schedule('0 12 * * *', async () => {
    try {
      await dispatchZeroTouch('pending_payment_recovery');
      await dispatchZeroTouch('smart_upsell');
      await dispatchZeroTouch('lost_customer_recovery');
      await dispatchZeroTouch('review_request');
    } catch (error) {
      console.error('[cron:zeroTouch:1200]', error);
    }
  }, { timezone: zone }));

  jobs.push(cron.schedule('0 18 * * *', async () => {
    try {
      await dispatchZeroTouch('segmented_evening_deals');
      await sendDailyReport();
    } catch (error) {
      console.error('[cron:1800]', error);
    }
  }, { timezone: zone }));

  jobs.push(cron.schedule('0 21 * * *', async () => {
    try {
      await dispatchZeroTouch('daily_zero_touch_summary');
    } catch (error) {
      console.error('[cron:zeroTouch:2100]', error);
    }
  }, { timezone: zone }));

  jobs.push(cron.schedule('*/30 * * * *', async () => {
    try {
      await checkLowStock();
    } catch (error) {
      console.error('[cron:lowStock]', error);
    }
  }, { timezone: zone }));

  jobs.push(cron.schedule('0 * * * *', async () => {
    try {
      const pending = await prisma.trustPending.findMany({ where: { status: 'pending' } });
      for (const row of pending) await checkTrustThreshold(row.dealerNumber);
      await dispatchZeroTouch('run_due_tasks');
    } catch (error) {
      console.error('[cron:trust]', error);
    }
  }, { timezone: zone }));

  jobs.push(cron.schedule('0 23 * * *', async () => {
    try {
      const result = await syncAll();
      io?.emit('sheets:sync', result);
      await dispatchZeroTouch('backup_and_plan');
    } catch (error) {
      console.error('[cron:sheets]', error);
    }
  }, { timezone: zone }));

  jobs.push(cron.schedule('15 11 * * *', async () => {
    for (const day of [1, 3, 25, 28]) {
      try {
        await sendFollowupForDay(day);
      } catch (error) {
        console.error(`[cron:followup:${day}]`, error);
      }
    }
  }, { timezone: zone }));

  return jobs;
}

module.exports = { scheduleAll };
