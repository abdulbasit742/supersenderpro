const prisma = require('./prisma');

function marginPct(sellPrice, buyPrice) {
  const buy = Number(buyPrice || 0);
  if (!buy) return 0;
  return ((Number(sellPrice || 0) - buy) / buy) * 100;
}

function minSellPrice(cost, desiredMarginPct = 20) {
  return Math.ceil(Number(cost || 0) * (1 + Number(desiredMarginPct || 0) / 100));
}

async function profitSuggestions({ sellPrice, quantity = 1, desiredMarginPct = 20 } = {}) {
  const rates = await prisma.rateEntry.findMany({
    orderBy: [{ toolName: 'asc' }, { planName: 'asc' }, { buyPrice: 'asc' }],
    include: { dealer: true, tool: true, plan: true }
  });
  return rates.map(rate => {
    const suggestedSell = sellPrice ? Number(sellPrice) : (rate.plan?.defaultSellPrice || minSellPrice(rate.buyPrice, desiredMarginPct));
    const profitEach = suggestedSell - rate.buyPrice;
    return {
      rateId: rate.id,
      tool: rate.toolName,
      plan: rate.planName,
      dealer: rate.dealer.name,
      dealerId: rate.dealerId,
      isPriorityDealer: rate.dealer.priority,
      isScammer: rate.dealer.isScammer,
      buyPrice: rate.buyPrice,
      sellPrice: suggestedSell,
      quantity: Number(quantity),
      profitEach,
      totalProfit: profitEach * Number(quantity),
      marginPct: marginPct(suggestedSell, rate.buyPrice)
    };
  }).sort((a, b) => {
    if (a.isScammer !== b.isScammer) return a.isScammer ? 1 : -1;
    if (a.isPriorityDealer !== b.isPriorityDealer) return a.isPriorityDealer ? -1 : 1;
    return b.marginPct - a.marginPct;
  });
}

async function dailyProfitSummary() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const sales = await prisma.sale.findMany({ where: { saleDate: { gte: start } } });
  return {
    revenue: sales.reduce((sum, s) => sum + Number(s.totalRevenue || 0), 0),
    profit: sales.reduce((sum, s) => sum + Number(s.profit || 0), 0),
    orders: sales.length,
    avgMargin: sales.length ? sales.reduce((sum, s) => sum + marginPct(s.sellPriceEach, s.costEach), 0) / sales.length : 0
  };
}

module.exports = { marginPct, minSellPrice, profitSuggestions, dailyProfitSummary };
