const priceAnalytics = require('../dealerIntelligence/priceAnalytics');
const stockManager = require('../dealerIntelligence/stockManager');

async function sendDailyPriceIntelligence(runtime) {
  const adminJid = runtime.adminJid();
  if (!adminJid) return;
  const report = priceAnalytics.buildDailyPriceReport();
  if (!report) return;
  await runtime.sendText(adminJid, report);
  priceAnalytics.snapshotDailyPriceHistory();
}

async function sendDealerRestockAlerts(runtime) {
  const rows = await stockManager.autoRestockAlerts(runtime, runtime.config.lowStockThreshold || 3);
  if (!rows.length) return;
  const adminJid = runtime.adminJid();
  if (!adminJid) return;
  await runtime.sendText(
    adminJid,
    `⚠️ *Auto Restock Alerts Sent*\n\n${rows.map(row => `• ${row.tool_slug} ${row.plan_slug} (${row.account_type}) -> ${row.primary_dealer_code}`).join('\n')}`
  );
}

module.exports = {
  sendDailyPriceIntelligence,
  sendDealerRestockAlerts
};
