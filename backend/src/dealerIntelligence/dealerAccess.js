const prisma = require('../services/prisma');

async function getDealerProfile(code) {
  const dealer = await prisma.trustedDealer.findUnique({ where: { dealerCode: code } });
  if (!dealer) return null;
  const [rates, stock] = await Promise.all([
    prisma.dealerRateIntelligence.findMany({ where: { dealerCode: code }, orderBy: { parsedAt: 'desc' }, take: 100 }),
    prisma.stockInventory.findMany({ where: { OR: [{ primaryDealerCode: code }, { backupDealerCode: code }] } })
  ]);
  const prices = rates.map((row) => Number(row.price || 0)).filter(Boolean);
  return {
    ...dealer,
    rates,
    stock,
    avgPricePerTool: rates.reduce((acc, row) => {
      const current = acc[row.toolSlug] || { total: 0, count: 0 };
      current.total += Number(row.price || 0);
      current.count += 1;
      acc[row.toolSlug] = { average: current.total / current.count, count: current.count };
      return acc;
    }, {}),
    lowestPriceEver: prices.length ? Math.min(...prices) : 0,
    highestPriceEver: prices.length ? Math.max(...prices) : 0,
    whatsappLink: `https://wa.me/${dealer.dealerNumber}`
  };
}

async function getDealerRates(code) {
  return prisma.dealerRateIntelligence.findMany({ where: { dealerCode: code }, orderBy: { parsedAt: 'desc' } });
}

async function getDealerStock(code) {
  return prisma.stockInventory.findMany({ where: { OR: [{ primaryDealerCode: code }, { backupDealerCode: code }] }, orderBy: { toolSlug: 'asc' } });
}

async function getBestDealerForTool(toolSlug) {
  const row = await prisma.dealerRateIntelligence.findFirst({
    where: { toolSlug, parsedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, trustStatus: { not: 'scammer' } },
    orderBy: [{ price: 'asc' }, { parsedAt: 'desc' }]
  });
  return row?.dealerCode ? getDealerProfile(row.dealerCode) : row;
}

module.exports = {
  getDealerProfile,
  getDealerRates,
  getDealerStock,
  getBestDealerForTool
};
