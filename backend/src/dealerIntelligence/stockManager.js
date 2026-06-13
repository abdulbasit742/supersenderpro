const prisma = require('../services/prisma');
const env = require('../config/env');
const { sendWhatsAppMessage } = require('../whatsapp/baileysClient');
const { formatStockSummary } = require('../utils/formatter');
const { syncStock } = require('../utils/sheetsSync');
const { encryptJson } = require('../security/encryption');

function keyWhere(toolSlug, type, planSlug = 'default') {
  return { toolSlug_planSlug_accountType: { toolSlug, planSlug, accountType: type } };
}

async function decrementStock(toolSlug, type, qty = 1, planSlug = 'default') {
  try {
    const row = await prisma.stockInventory.findUnique({ where: keyWhere(toolSlug, type, planSlug) });
    if (!row) return { success: false, message: 'Stock row not found.' };
    const next = Math.max(0, Number(row.quantityAvailable || 0) - Number(qty || 1));
    const updated = await prisma.stockInventory.update({
      where: { id: row.id },
      data: { quantityAvailable: next }
    });
    if (next <= Number(row.lowStockThreshold || env.lowStockThreshold)) await checkLowStock();
    syncStock().catch(() => {});
    return { success: true, stock: updated };
  } catch (error) {
    console.error('[stock:decrementStock]', error);
    return { success: false, message: error.message };
  }
}

async function sendAdminLowStock(row) {
  const message = `⚠️ LOW STOCK\n${row.toolSlug} ${row.planSlug} ${row.accountType}\nAvailable: ${row.quantityAvailable}\nDealer: ${row.primaryDealerCode || '-'}`;
  await prisma.adminAlert.create({
    data: { type: 'low_stock', title: `${row.toolSlug} ${row.accountType} low stock`, message, severity: row.quantityAvailable <= 0 ? 'danger' : 'warning', payload: row }
  }).catch(() => null);
  if (env.adminNumber) {
    try {
      await sendWhatsAppMessage({ to: `${env.adminNumber}@s.whatsapp.net`, message });
    } catch (error) {
      console.error('[stock:adminAlertWhatsApp]', error);
    }
  }
  return message;
}

async function autoAlertDealer(toolSlug, type, dealerCode, planSlug = 'default') {
  try {
    if (!dealerCode) return { success: false, message: 'dealerCode missing' };
    const dealer = await prisma.trustedDealer.findUnique({ where: { dealerCode } });
    if (!dealer) return { success: false, message: 'dealer not found' };
    const stock = await prisma.stockInventory.findUnique({ where: keyWhere(toolSlug, type, planSlug) }).catch(() => null);
    const message = [
      `السلام علیکم ${dealer.dealerName || dealer.dealerCode}!`,
      `${toolSlug} ${planSlug} ${type} stock کم ہو رہی ہے۔`,
      `ابھی available: ${stock?.quantityAvailable ?? 0}`,
      'کیا آپ کے پاس اور available ہے؟ Price کیا ہوگی؟'
    ].join('\n');
    try {
      await sendWhatsAppMessage({ to: `${dealer.dealerNumber}@s.whatsapp.net`, message });
      return { success: true, message };
    } catch (error) {
      console.error('[stock:autoAlertDealer]', error);
      await prisma.adminAlert.create({
        data: { type: 'dealer_restock_alert', title: `Restock alert for ${dealerCode}`, message, severity: 'info', payload: { dealerCode, toolSlug, planSlug, type } }
      }).catch(() => null);
      return { success: false, message, error: error.message };
    }
  } catch (error) {
    console.error('[stock:autoAlertDealer]', error);
    return { success: false, message: error.message };
  }
}

async function checkLowStock() {
  try {
    const rows = await prisma.stockInventory.findMany({
      where: { quantityAvailable: { lte: env.lowStockThreshold } },
      orderBy: [{ quantityAvailable: 'asc' }, { toolSlug: 'asc' }]
    });
    for (const row of rows) {
      await sendAdminLowStock(row);
      if (row.autoReorder && row.primaryDealerCode) {
        await autoAlertDealer(row.toolSlug, row.accountType, row.primaryDealerCode, row.planSlug);
      }
    }
    return rows;
  } catch (error) {
    console.error('[stock:checkLowStock]', error);
    return [];
  }
}

async function notifyWaitingCustomers(toolSlug, type, planSlug = 'default') {
  try {
    const plan = await prisma.toolPlan.findFirst({ where: { tool: { slug: toolSlug }, slug: planSlug }, include: { tool: true } });
    if (!plan) return [];
    const waiting = await prisma.notifyMe.findMany({
      where: { toolId: plan.toolId, planId: plan.id, accountType: type, status: 'waiting' },
      include: { customer: true, tool: true, plan: true }
    });
    const notified = [];
    for (const row of waiting) {
      const message = `✅ ${row.tool.name} ${row.plan?.name || ''} ${type} دوبارہ available ہے.\nOrder ke liye *order ${row.tool.name}* reply karein.`;
      try {
        await sendWhatsAppMessage({ to: `${row.phone}@s.whatsapp.net`, message });
        await prisma.notifyMe.update({ where: { id: row.id }, data: { status: 'notified', notifiedAt: new Date() } });
      } catch (error) {
        console.error('[stock:notifyWaitingCustomer]', error);
        await prisma.notifyMe.update({ where: { id: row.id }, data: { status: 'ready_to_notify' } }).catch(() => null);
      }
      notified.push(row);
    }
    return notified;
  } catch (error) {
    console.error('[stock:notifyWaitingCustomers]', error);
    return [];
  }
}

async function addStockItem(toolSlug, type, dealerCode, credentials = {}, planSlug = 'default') {
  try {
    let resolvedPlanSlug = planSlug;
    if (!resolvedPlanSlug || resolvedPlanSlug === 'default') {
      const plan = await prisma.toolPlan.findFirst({
        where: { tool: { slug: toolSlug }, active: true },
        orderBy: { slug: 'asc' }
      }).catch(() => null);
      resolvedPlanSlug = plan?.slug || 'default';
    }
    const safeCredentials = {
      ...credentials,
      accountEmail: credentials.accountEmail || credentials.email || '',
      accountPass: credentials.accountPass || credentials.password || ''
    };
    const row = await prisma.stockKey.create({
      data: {
        toolSlug,
        planSlug: resolvedPlanSlug,
        accountType: type,
        credentials: { encrypted: true, dealerCode: dealerCode || null },
        credentialsEncrypted: encryptJson(safeCredentials),
        dealerCode,
        expiryDate: safeCredentials.expiryDate ? new Date(safeCredentials.expiryDate) : null
      }
    });
    const inventory = await prisma.stockInventory.upsert({
      where: keyWhere(toolSlug, type, resolvedPlanSlug),
      update: {
        quantityAvailable: { increment: 1 },
        quantityTotal: { increment: 1 },
        primaryDealerCode: dealerCode || undefined,
        lastRestockedDate: new Date(),
        lastRestockedBy: dealerCode || 'admin'
      },
      create: {
        toolSlug,
        planSlug: resolvedPlanSlug,
        accountType: type,
        quantityAvailable: 1,
        quantityTotal: 1,
        primaryDealerCode: dealerCode || null,
        lastRestockedDate: new Date(),
        lastRestockedBy: dealerCode || 'admin',
        lowStockThreshold: env.lowStockThreshold,
        autoReorder: true
      }
    });
    await notifyWaitingCustomers(toolSlug, type, resolvedPlanSlug);
    syncStock().catch(() => {});
    return { success: true, key: row, inventory };
  } catch (error) {
    console.error('[stock:addStockItem]', error);
    return { success: false, message: error.message };
  }
}

async function getStockSummary() {
  const rows = await prisma.stockInventory.findMany({ orderBy: [{ toolSlug: 'asc' }, { planSlug: 'asc' }, { accountType: 'asc' }] });
  return { rows, text: formatStockSummary(rows) };
}

async function getStockByDealer(dealerCode) {
  return prisma.stockInventory.findMany({
    where: { OR: [{ primaryDealerCode: dealerCode }, { backupDealerCode: dealerCode }] },
    orderBy: [{ toolSlug: 'asc' }, { planSlug: 'asc' }]
  });
}

module.exports = {
  decrementStock,
  checkLowStock,
  autoAlertDealer,
  addStockItem,
  getStockSummary,
  notifyWaitingCustomers,
  getStockByDealer
};
