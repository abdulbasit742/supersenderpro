const prisma = require('./prisma');

function sinceDays(days = 7) {
  return new Date(Date.now() - Number(days || 7) * 24 * 60 * 60 * 1000);
}

function spreadPct(lowest, highest) {
  const low = Number(lowest || 0);
  const high = Number(highest || 0);
  if (!low || !high) return 0;
  return ((high - low) / low) * 100;
}

async function ratesFor(toolSlug, planSlug, days = 7) {
  return prisma.dealerRateIntelligence.findMany({
    where: {
      toolSlug,
      ...(planSlug ? { planSlug } : {}),
      parsedAt: { gte: sinceDays(days) },
      trustStatus: { not: 'scammer' }
    },
    orderBy: [{ price: 'asc' }, { parsedAt: 'desc' }]
  });
}

async function getLowestPrice(toolSlug, planSlug) {
  const row = await prisma.dealerRateIntelligence.findFirst({
    where: { toolSlug, ...(planSlug ? { planSlug } : {}), parsedAt: { gte: sinceDays(1) }, trustStatus: { not: 'scammer' } },
    orderBy: [{ price: 'asc' }, { parsedAt: 'desc' }]
  });
  return row ? { price: row.price, dealerCode: row.dealerCode, dealerName: row.dealerName, timestamp: row.parsedAt } : null;
}

async function getHighestPrice(toolSlug, planSlug) {
  const row = await prisma.dealerRateIntelligence.findFirst({
    where: { toolSlug, ...(planSlug ? { planSlug } : {}), parsedAt: { gte: sinceDays(1) }, trustStatus: { not: 'scammer' } },
    orderBy: [{ price: 'desc' }, { parsedAt: 'desc' }]
  });
  return row ? { price: row.price, dealerCode: row.dealerCode, dealerName: row.dealerName, timestamp: row.parsedAt } : null;
}

async function getAveragePrice(toolSlug, planSlug, days = 7) {
  const agg = await prisma.dealerRateIntelligence.aggregate({
    where: { toolSlug, ...(planSlug ? { planSlug } : {}), parsedAt: { gte: sinceDays(days) }, trustStatus: { not: 'scammer' } },
    _avg: { price: true }
  });
  return Number(agg._avg.price || 0);
}

async function getPriceSpread(toolSlug, planSlug) {
  const rows = await ratesFor(toolSlug, planSlug, 7);
  if (!rows.length) return { lowest: 0, highest: 0, average: 0, spreadPct: 0, bestDealer: null };
  const prices = rows.map((row) => Number(row.price || 0));
  const lowest = Math.min(...prices);
  const highest = Math.max(...prices);
  const average = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  const best = rows.find((row) => Number(row.price) === lowest);
  return { lowest, highest, average, spreadPct: spreadPct(lowest, highest), bestDealer: best };
}

async function getBestDealerByTool(toolSlug) {
  const rows = await ratesFor(toolSlug, undefined, 30);
  const map = new Map();
  for (const row of rows) {
    const key = row.dealerCode || row.dealerNumber;
    const current = map.get(key) || { dealerCode: row.dealerCode, dealerName: row.dealerName, dealerNumber: row.dealerNumber, count: 0, total: 0 };
    current.count += 1;
    current.total += Number(row.price || 0);
    current.average = current.total / current.count;
    map.set(key, current);
  }
  return Array.from(map.values()).sort((a, b) => a.average - b.average || b.count - a.count)[0] || null;
}

async function getBestDealer(toolSlug) {
  return getBestDealerByTool(toolSlug);
}

async function getPriceTrend(toolSlug, days = 30) {
  const rows = await prisma.dealerRateIntelligence.findMany({
    where: { toolSlug, parsedAt: { gte: sinceDays(days) }, trustStatus: { not: 'scammer' } },
    orderBy: { parsedAt: 'asc' }
  });
  const map = new Map();
  for (const row of rows) {
    const day = row.parsedAt.toISOString().slice(0, 10);
    const current = map.get(day) || { day, total: 0, count: 0, lowest: Number(row.price), highest: Number(row.price) };
    current.total += Number(row.price || 0);
    current.count += 1;
    current.lowest = Math.min(current.lowest, Number(row.price || 0));
    current.highest = Math.max(current.highest, Number(row.price || 0));
    current.average = current.total / current.count;
    map.set(day, current);
  }
  return Array.from(map.values());
}

async function getDailyPriceSummary() {
  const tools = await prisma.toolPlan.findMany({ include: { tool: true }, where: { active: true }, orderBy: [{ tool: { name: 'asc' } }, { name: 'asc' }] });
  const rows = [];
  for (const plan of tools) {
    const [lowest, highest, average] = await Promise.all([
      getLowestPrice(plan.tool.slug, plan.slug),
      getHighestPrice(plan.tool.slug, plan.slug),
      getAveragePrice(plan.tool.slug, plan.slug, 7)
    ]);
    rows.push({
      tool: plan.tool.name,
      toolSlug: plan.tool.slug,
      plan: plan.name,
      planSlug: plan.slug,
      lowest,
      highest,
      average
    });
  }
  return rows;
}

async function getDailyReport() {
  return getDailyPriceSummary();
}

async function getProfitMargin(toolSlug, sellPrice) {
  const lowest = await getLowestPrice(toolSlug);
  const buyPrice = Number(lowest?.price || 0);
  const sell = Number(sellPrice || 0);
  if (!buyPrice || !sell) return { toolSlug, buyPrice, sellPrice: sell, profit: 0, marginPct: 0 };
  const profit = sell - buyPrice;
  return { toolSlug, buyPrice, sellPrice: sell, profit, marginPct: Number(((profit / buyPrice) * 100).toFixed(2)), dealer: lowest };
}

async function compareAllDealers(toolSlug) {
  const rows = await prisma.dealerRateIntelligence.findMany({
    where: { toolSlug, parsedAt: { gte: sinceDays(7) }, trustStatus: { not: 'scammer' } },
    orderBy: [{ price: 'asc' }, { parsedAt: 'desc' }]
  });
  const dealers = await prisma.trustedDealer.findMany({
    where: { dealerNumber: { in: [...new Set(rows.map((row) => row.dealerNumber))] } }
  });
  const trust = new Map(dealers.map((dealer) => [dealer.dealerNumber, dealer]));
  return rows.map((row) => ({
    dealer: row.dealerCode || row.dealerNumber,
    dealerName: row.dealerName,
    dealerNumber: row.dealerNumber,
    price: row.price,
    planSlug: row.planSlug,
    reliability: Number(trust.get(row.dealerNumber)?.trustScore || (row.trustStatus === 'trusted' ? 70 : 40)),
    timestamp: row.parsedAt
  }));
}

module.exports = {
  getLowestPrice,
  getHighestPrice,
  getAveragePrice,
  getPriceSpread,
  getBestDealerByTool,
  getBestDealer,
  getPriceTrend,
  getDailyPriceSummary,
  getDailyReport,
  getProfitMargin,
  compareAllDealers
};
