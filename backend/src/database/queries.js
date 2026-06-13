const prisma = require('../services/prisma');
const { normalizePhone } = require('../utils/phone');

async function findCustomerByWhatsApp(number) {
  const whatsapp = normalizePhone(number);
  if (!whatsapp) return null;
  return prisma.customer.findUnique({ where: { whatsapp } });
}

async function getPendingOrdersForPayment() {
  return prisma.businessOrder.findMany({
    where: { status: { in: ['awaiting_payment', 'awaiting_verification', 'payment_pending'] } },
    include: { customer: true, tool: true, plan: true, accountType: true },
    orderBy: { createdAt: 'desc' }
  });
}

async function getStockLevels() {
  return prisma.stockInventory.findMany({
    orderBy: [{ toolSlug: 'asc' }, { planSlug: 'asc' }, { accountType: 'asc' }]
  });
}

async function getTodayOrders() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return prisma.businessOrder.findMany({
    where: { createdAt: { gte: start } },
    include: { customer: true, tool: true, plan: true, accountType: true },
    orderBy: { createdAt: 'desc' }
  });
}

module.exports = {
  findCustomerByWhatsApp,
  getPendingOrdersForPayment,
  getStockLevels,
  getTodayOrders
};
