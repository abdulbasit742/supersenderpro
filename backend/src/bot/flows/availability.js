const prisma = require('../../services/prisma');
const { formatAvailability } = require('../../utils/formatter');
const { normalizePhone } = require('../../utils/phone');
const { getDynamicAvailability } = require('../../zeroTouch/pricing');

async function getAvailabilityRows(toolSlug = '') {
  const rows = await prisma.pricing.findMany({
    include: { tool: true, plan: true, accountType: true },
    where: toolSlug ? { tool: { slug: toolSlug } } : {},
    orderBy: [{ tool: { name: 'asc' } }, { plan: { name: 'asc' } }, { accountType: { sortOrder: 'asc' } }]
  });
  const stockRows = await prisma.stockInventory.findMany();
  const stock = new Map(stockRows.map((row) => [`${row.toolSlug}:${row.planSlug}:${row.accountType}`, row]));
  return rows.map((row) => {
    const inv = stock.get(`${row.tool.slug}:${row.plan.slug}:${row.accountType.name}`);
    const slots = Math.max(Number(inv?.quantityAvailable || 0), Number(row.manualSlots || 0));
    return {
      tool: row.tool.name,
      toolSlug: row.tool.slug,
      plan: row.plan.name,
      planSlug: row.plan.slug,
      accountType: row.accountType.name,
      price: row.price,
      limitedTime: row.isLimitedTime,
      slots,
      inStock: slots > 0
    };
  });
}

async function showAvailability(toolSlug = '') {
  const rows = await getDynamicAvailability().catch(() => getAvailabilityRows(toolSlug));
  return formatAvailability(toolSlug ? rows.filter((row) => row.toolSlug === toolSlug) : rows);
}

async function saveNotifyRequest({ phone, toolSlug, planSlug = 'plus', accountType = 'private', name = 'Customer' }) {
  const normalized = normalizePhone(phone);
  const plan = await prisma.toolPlan.findFirst({ where: { tool: { slug: toolSlug }, slug: planSlug }, include: { tool: true } });
  if (!normalized || !plan) return { success: false, message: 'Phone or plan not found' };
  const customer = await prisma.customer.upsert({
    where: { whatsapp: normalized },
    update: { name },
    create: { whatsapp: normalized, name }
  });
  const row = await prisma.notifyMe.create({
    data: { phone: normalized, customerId: customer.id, toolId: plan.toolId, planId: plan.id, accountType }
  });
  return { success: true, row, message: 'Notify request saved. Stock available hotay hi message chala jayega.' };
}

module.exports = {
  getAvailabilityRows,
  showAvailability,
  saveNotifyRequest
};
