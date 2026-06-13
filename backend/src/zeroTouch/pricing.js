const prisma = require('../services/prisma');
const { normalizePhone } = require('../utils/phone');
const { money } = require('../utils/formatter');
const {
  getLowestPrice,
  getHighestPrice,
  getAveragePrice,
  getBestDealerByTool
} = require('../services/priceAnalytics');

function roundPrice(value) {
  return Math.max(0, Math.round(Number(value || 0) / 10) * 10);
}

function stockKey(toolSlug, planSlug, accountType) {
  return { toolSlug_planSlug_accountType: { toolSlug, planSlug, accountType } };
}

function applyDynamicRules(basePrice, stockQty, customer = null, memory = null) {
  let price = Number(basePrice || 0);
  const reasons = [];
  const tier = memory?.scoreTier || (customer?.isVip ? 'VIP' : '');

  if (stockQty > 0 && stockQty < 3) {
    price += 100;
    reasons.push('low_stock_limited_plus_100');
  }
  if (stockQty > 10) {
    price -= 50;
    reasons.push('high_stock_discount_50');
  }
  if (customer && Number(customer.totalOrders || 0) === 0) {
    price -= 50;
    reasons.push('first_time_buyer_discount_50');
  }
  if (tier === 'VIP') {
    price *= 0.9;
    reasons.push('vip_10_percent_discount');
  }

  return {
    price: roundPrice(price),
    originalPrice: Number(basePrice || 0),
    reasons,
    limited: stockQty > 0 && stockQty < 3,
    tier: tier || 'Bronze'
  };
}

async function getCustomerForPricing(customerPhone = '') {
  const phone = normalizePhone(customerPhone);
  if (!phone) return { customer: null, memory: null };
  const customer = await prisma.customer.findUnique({
    where: { whatsapp: phone },
    include: { memory: true }
  }).catch(() => null);
  return { customer, memory: customer?.memory || null };
}

async function getDynamicPriceForPlan({ toolSlug, planSlug, accountType = 'private', customerPhone = '' }) {
  const pricing = await prisma.pricing.findFirst({
    where: {
      tool: { slug: toolSlug },
      plan: { slug: planSlug },
      accountType: { name: accountType }
    },
    include: { tool: true, plan: true, accountType: true }
  });
  if (!pricing) return null;
  const [stock, customerData] = await Promise.all([
    prisma.stockInventory.findUnique({ where: stockKey(toolSlug, planSlug, accountType) }).catch(() => null),
    getCustomerForPricing(customerPhone)
  ]);
  const stockQty = Number(stock?.quantityAvailable || pricing.manualSlots || 0);
  const dynamic = applyDynamicRules(pricing.price, stockQty, customerData.customer, customerData.memory);
  return {
    tool: pricing.tool,
    plan: pricing.plan,
    accountType: pricing.accountType,
    basePrice: Number(pricing.price || 0),
    stockQty,
    ...dynamic
  };
}

async function getDynamicAvailability(customerPhone = '') {
  const rows = await prisma.pricing.findMany({
    include: { tool: true, plan: true, accountType: true },
    orderBy: [{ tool: { name: 'asc' } }, { plan: { name: 'asc' } }, { accountType: { sortOrder: 'asc' } }]
  });
  const stockRows = await prisma.stockInventory.findMany().catch(() => []);
  const stock = new Map(stockRows.map((row) => [`${row.toolSlug}:${row.planSlug}:${row.accountType}`, row]));
  const customerData = await getCustomerForPricing(customerPhone);

  return rows.map((row) => {
    const inventory = stock.get(`${row.tool.slug}:${row.plan.slug}:${row.accountType.name}`);
    const stockQty = Number(inventory?.quantityAvailable || row.manualSlots || 0);
    const dynamic = applyDynamicRules(row.price, stockQty, customerData.customer, customerData.memory);
    return {
      toolSlug: row.tool.slug,
      tool: row.tool.name,
      toolName: row.tool.name,
      planSlug: row.plan.slug,
      plan: row.plan.name,
      planName: row.plan.name,
      accountType: row.accountType.name,
      accountLabel: row.accountType.label,
      stockQty,
      slots: stockQty,
      inStock: stockQty > 0,
      basePrice: Number(row.price || 0),
      price: dynamic.price,
      reasons: dynamic.reasons,
      limited: dynamic.limited || row.isLimitedTime,
      limitedTime: dynamic.limited || row.isLimitedTime,
      limitedLabel: dynamic.limited ? 'LIMITED - low stock' : row.limitedLabel,
      tier: dynamic.tier,
      policySummary: row.policySummary || row.accountType.policySummary
    };
  });
}

async function suggestOptimalSellingPrice(toolSlug, planSlug, accountType = 'private') {
  const [lowest, stock] = await Promise.all([
    getLowestPrice(toolSlug, planSlug),
    prisma.stockInventory.findUnique({ where: stockKey(toolSlug, planSlug, accountType) }).catch(() => null)
  ]);
  const buyPrice = Number(lowest?.price || 0);
  if (!buyPrice) return null;
  const stockQty = Number(stock?.quantityAvailable || 0);
  let margin = 0.35;
  if (stockQty > 0 && stockQty < 3) margin = 0.45;
  if (stockQty > 10) margin = 0.28;
  const sellPrice = roundPrice(buyPrice * (1 + margin));
  return {
    toolSlug,
    planSlug,
    accountType,
    buyPrice,
    sellPrice,
    profit: sellPrice - buyPrice,
    marginPct: Number((((sellPrice - buyPrice) / buyPrice) * 100).toFixed(2)),
    dealer: lowest,
    stockQty
  };
}

async function snapshotToolPlan(plan) {
  const [lowest, highest, average, bestDealer] = await Promise.all([
    getLowestPrice(plan.tool.slug, plan.slug),
    getHighestPrice(plan.tool.slug, plan.slug),
    getAveragePrice(plan.tool.slug, plan.slug, 7),
    getBestDealerByTool(plan.tool.slug)
  ]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const data = {
    lowestPrice: Number(lowest?.price || 0),
    highestPrice: Number(highest?.price || 0),
    averagePrice: Number(average || 0),
    bestDealerCode: lowest?.dealerCode || bestDealer?.dealerCode || null,
    bestDealerName: lowest?.dealerName || bestDealer?.dealerName || null,
    spreadPct: lowest?.price && highest?.price ? Number((((highest.price - lowest.price) / lowest.price) * 100).toFixed(2)) : 0
  };
  if (!data.lowestPrice && !data.averagePrice) return null;
  return prisma.priceHistory.upsert({
    where: { toolSlug_planSlug_summaryDate: { toolSlug: plan.tool.slug, planSlug: plan.slug, summaryDate: today } },
    update: data,
    create: {
      toolSlug: plan.tool.slug,
      planSlug: plan.slug,
      summaryDate: today,
      ...data
    }
  });
}

async function compareDealerPricesHourly() {
  const plans = await prisma.toolPlan.findMany({ where: { active: true }, include: { tool: true } });
  const recommendations = [];
  const alerts = [];

  for (const plan of plans) {
    const latestBefore = await prisma.priceHistory.findFirst({
      where: { toolSlug: plan.tool.slug, planSlug: plan.slug },
      orderBy: { summaryDate: 'desc' }
    }).catch(() => null);
    const snapshot = await snapshotToolPlan(plan).catch((error) => {
      console.error('[zeroTouch:pricing:snapshot]', error);
      return null;
    });
    const rec = await suggestOptimalSellingPrice(plan.tool.slug, plan.slug).catch(() => null);
    if (rec) recommendations.push({ ...rec, toolName: plan.tool.name, planName: plan.name });
    if (snapshot && latestBefore?.lowestPrice && snapshot.lowestPrice && snapshot.lowestPrice + 49 < latestBefore.lowestPrice) {
      const msg = `${plan.tool.name} ${plan.name}: new low ${money(snapshot.lowestPrice)} (was ${money(latestBefore.lowestPrice)})`;
      alerts.push(msg);
      await prisma.adminAlert.create({
        data: {
          type: 'dealer_price_drop',
          title: `Better dealer price: ${plan.tool.name} ${plan.name}`,
          message: msg,
          severity: 'success',
          payload: { planId: plan.id, snapshot }
        }
      }).catch(() => null);
    }
  }

  return { recommendations, alerts };
}

async function buildPricingRecommendations() {
  const plans = await prisma.toolPlan.findMany({ where: { active: true }, include: { tool: true }, take: 25 });
  const rows = [];
  for (const plan of plans) {
    const rec = await suggestOptimalSellingPrice(plan.tool.slug, plan.slug).catch(() => null);
    if (rec) rows.push({ ...rec, toolName: plan.tool.name, planName: plan.name });
  }
  return rows.sort((a, b) => b.marginPct - a.marginPct);
}

module.exports = {
  applyDynamicRules,
  getDynamicPriceForPlan,
  getDynamicAvailability,
  suggestOptimalSellingPrice,
  compareDealerPricesHourly,
  buildPricingRecommendations
};
