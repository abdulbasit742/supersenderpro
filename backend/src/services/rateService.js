const prisma = require('./prisma');
const { createAlert } = require('./alertService');

function slugify(value = '') {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'default';
}

async function ensureToolAndPlan(toolName, planName = 'Default') {
  const tool = await prisma.tool.upsert({
    where: { slug: slugify(toolName) },
    update: { name: toolName },
    create: { name: toolName, slug: slugify(toolName) }
  });
  const plan = await prisma.toolPlan.upsert({
    where: { toolId_slug: { toolId: tool.id, slug: slugify(planName) } },
    update: { name: planName },
    create: { toolId: tool.id, name: planName, slug: slugify(planName), defaultSellPrice: 0 }
  });
  return { tool, plan };
}

async function createRateEntry(input) {
  const { tool, plan } = await ensureToolAndPlan(input.toolName || input.tool_name, input.planName || input.plan_name || 'Default');
  const dealerId = input.dealerId || input.dealer_id;
  if (!dealerId) throw new Error('dealerId is required');

  const rate = await prisma.rateEntry.create({
    data: {
      dealerId,
      toolId: tool.id,
      planId: plan.id,
      toolName: tool.name,
      planName: plan.name,
      buyPrice: Number(input.buyPrice || input.buy_price),
      sellPrice: input.sellPrice === undefined ? null : Number(input.sellPrice),
      source: input.source || 'MANUAL',
      groupId: input.groupId || null,
      messageId: input.messageId || null,
      rawText: input.rawText || null,
      rateDate: input.rateDate ? new Date(input.rateDate) : new Date()
    },
    include: { dealer: true, tool: true, plan: true }
  });

  const previous = await prisma.rateEntry.findFirst({
    where: {
      id: { not: rate.id },
      toolId: rate.toolId,
      planId: rate.planId
    },
    orderBy: { rateDate: 'desc' }
  });

  if (previous && rate.buyPrice < previous.buyPrice * 0.92) {
    await createAlert({
      type: 'rate_drop',
      title: `${rate.toolName} ${rate.planName} rate dropped`,
      message: `New rate Rs. ${rate.buyPrice} from ${rate.dealer.name}. Previous was Rs. ${previous.buyPrice}.`,
      severity: 'success',
      meta: { rateId: rate.id, dealerId: rate.dealerId }
    });
  }

  return rate;
}

async function cheapestRates() {
  const all = await prisma.rateEntry.findMany({
    orderBy: [{ rateDate: 'desc' }],
    include: { dealer: true, tool: true, plan: true }
  });
  const map = new Map();
  for (const row of all) {
    const key = `${row.toolName}__${row.planName}`;
    const current = map.get(key);
    if (!current || row.buyPrice < current.buyPrice || (row.buyPrice === current.buyPrice && row.dealer.priority && !current.dealer.priority)) {
      map.set(key, row);
    }
  }
  return Array.from(map.values()).sort((a, b) => a.buyPrice - b.buyPrice);
}

async function rateHistory(toolId, planId, days = 30) {
  const since = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);
  return prisma.rateEntry.findMany({
    where: { toolId, ...(planId ? { planId } : {}), rateDate: { gte: since } },
    orderBy: { rateDate: 'asc' },
    include: { dealer: true }
  });
}

module.exports = { createRateEntry, ensureToolAndPlan, cheapestRates, rateHistory, slugify };
