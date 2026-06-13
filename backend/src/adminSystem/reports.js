const prisma = require('../services/prisma');
const { getDailyPriceSummary } = require('../services/priceAnalytics');
const { money, formatPriceReport } = require('../utils/formatter');

async function dailySalesSummary() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const orders = await prisma.businessOrder.findMany({ where: { createdAt: { gte: today } }, include: { tool: true, plan: true } });
  const revenue = orders.reduce((sum, row) => sum + Number(row.sellPrice || 0) * Number(row.quantity || 1), 0);
  const profit = orders.reduce((sum, row) => sum + Number(row.profit || 0), 0);
  return {
    orders: orders.length,
    revenue,
    profit,
    text: `📊 *Daily Summary*\nOrders: ${orders.length}\nRevenue: ${money(revenue)}\nProfit: ${money(profit)}`
  };
}

async function priceIntelligenceText() {
  const rows = await getDailyPriceSummary();
  return formatPriceReport(rows);
}

module.exports = {
  dailySalesSummary,
  priceIntelligenceText
};
