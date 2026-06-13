const cron = require('node-cron');
const config = require('./config');
const db = require('./db');
const fmt = require('./formatters');

function registerCronJobs(sessionManager) {
  cron.schedule(config.rateCollectionCron, async () => {
    try {
      const rates = db.getCheapestRates(24);
      await sessionManager.sendToAdmins(`☀️ *9 AM Rate Snapshot*\n\n${fmt.priceList(rates)}`);
      console.log(`📊 9 AM rate snapshot sent (${rates.length} cheapest rows)`);
    } catch (error) {
      console.error('Rate snapshot cron error:', error.message);
    }
  }, { timezone: config.timezone });

  cron.schedule(config.priceBroadcastCron, async () => {
    try {
      const message = fmt.priceList(db.getCheapestRates(24));
      const result = await sessionManager.broadcastToCustomerGroups(message);
      await sessionManager.sendToAdmins(`📢 *10 AM Price Broadcast Done*\nSent: ${result.sent.length}\nFailed: ${result.failed.length}`);
      console.log(`📢 Price broadcast sent to ${result.sent.length} groups`);
    } catch (error) {
      console.error('Price broadcast cron error:', error.message);
    }
  }, { timezone: config.timezone });

  cron.schedule(config.salesSummaryCron, async () => {
    try {
      await sessionManager.sendToAdmins(fmt.salesSummary(db.getDailySalesSummary()));
      console.log('🌙 Daily sales summary sent');
    } catch (error) {
      console.error('Sales summary cron error:', error.message);
    }
  }, { timezone: config.timezone });
}

async function checkLowStock(sessionManager) {
  const low = db.getStock().filter(s => Number(s.qty) < Number(s.threshold));
  if (low.length) {
    await sessionManager.sendToAdmins(fmt.lowStockAlert(low));
  }
  return low;
}

module.exports = { registerCronJobs, checkLowStock };
