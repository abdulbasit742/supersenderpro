const prisma = require('../services/prisma');
const { money } = require('../utils/formatter');

function startOfDay(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  date.setHours(0, 0, 0, 0);
  return date;
}

async function salesSummary({ from = startOfDay(0), to = new Date() } = {}) {
  const orders = await prisma.businessOrder.findMany({
    where: { createdAt: { gte: from, lte: to } },
    include: { tool: true }
  });
  const revenue = orders.reduce((sum, row) => sum + Number(row.sellPrice || 0) * Number(row.quantity || 1), 0);
  const profit = orders.reduce((sum, row) => sum + Number(row.profit || 0), 0);
  const toolMap = new Map();
  for (const order of orders) {
    const key = order.tool?.name || 'Unknown';
    toolMap.set(key, (toolMap.get(key) || 0) + Number(order.quantity || 1));
  }
  return {
    from,
    to,
    orders: orders.length,
    delivered: orders.filter((row) => row.status === 'delivered').length,
    revenue,
    profit,
    topTool: [...toolMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '-'
  };
}

async function formatDailyReport() {
  const summary = await salesSummary();
  return [
    '📊 Daily AI Tools Report',
    `Orders: ${summary.orders}`,
    `Delivered: ${summary.delivered}`,
    `Revenue: ${money(summary.revenue)}`,
    `Profit: ${money(summary.profit)}`,
    `Top tool: ${summary.topTool}`
  ].join('\n');
}

module.exports = {
  salesSummary,
  formatDailyReport
};
