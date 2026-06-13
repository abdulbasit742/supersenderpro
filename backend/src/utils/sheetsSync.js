const { google } = require('googleapis');
const prisma = require('../services/prisma');
const env = require('../config/env');
const { sendWhatsAppMessage } = require('../whatsapp/baileysClient');

const SHEETS = {
  dailyRates: 'Daily Rates',
  purchases: 'Purchases',
  sales: 'Sales',
  pnl: 'P&L Summary',
  dealers: 'Dealers',
  stock: 'Stock Status'
};

function credentialsFromEnv() {
  if (env.googleServiceAccountJson) return JSON.parse(env.googleServiceAccountJson);
  if (env.googleServiceAccountEmail && env.googlePrivateKey) {
    return {
      client_email: env.googleServiceAccountEmail,
      private_key: env.googlePrivateKey.replace(/\\n/g, '\n')
    };
  }
  return null;
}

function sheetsClient() {
  const credentials = credentialsFromEnv();
  if (!env.googleSheetsId || !credentials) return null;
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  return google.sheets({ version: 'v4', auth });
}

async function alertFailure(action, error) {
  console.error(`[sheets:${action}]`, error);
  const message = `Sheets sync failed: ${action}\n${error.message || String(error)}`;
  await prisma.adminAlert.create({
    data: {
      type: 'sheets_sync_failed',
      title: `Google Sheets sync failed: ${action}`,
      message,
      severity: 'warning',
      payload: { action }
    }
  }).catch(() => null);
  if (env.adminNumber) {
    try {
      await sendWhatsAppMessage({ to: `${env.adminNumber}@s.whatsapp.net`, sessionKey: env.adminSessionId, message });
    } catch (sendError) {
      console.error('[sheets:adminAlertWhatsApp]', sendError);
    }
  }
}

async function retry(action, fn, attempts = 3) {
  let lastError;
  const retryDelayMs = Number(process.env.SHEETS_RETRY_DELAY_MS || 5 * 60 * 1000);
  for (let i = 1; i <= attempts; i += 1) {
    try {
      const result = await fn();
      console.log(`Sheets synced: ${new Date().toISOString()} (${action})`);
      await prisma.adminAlert.create({
        data: {
          type: 'sheets_sync',
          title: `Sheets sync success: ${action}`,
          message: `${action} completed`,
          severity: 'info',
          payload: result
        }
      }).catch(() => null);
      return result;
    } catch (error) {
      lastError = error;
      console.error(`[sheets:${action}] attempt ${i}/${attempts} failed`, error);
      if (i < attempts) await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }
  await alertFailure(action, lastError);
  return { success: false, action, message: lastError.message };
}

function configured() {
  return Boolean(env.googleSheetsId && credentialsFromEnv());
}

async function clearSheet(sheetName) {
  if (!configured()) return { success: false, skipped: true, reason: 'Google Sheets not configured' };
  const sheets = sheetsClient();
  await sheets.spreadsheets.values.clear({
    spreadsheetId: env.googleSheetsId,
    range: `'${sheetName}'!A:Z`
  });
  return { success: true, sheetName, cleared: true };
}

async function writeSheet(sheetName, rows) {
  if (!configured()) return { success: false, skipped: true, reason: 'Google Sheets not configured', sheetName };
  const sheets = sheetsClient();
  await clearSheet(sheetName);
  await sheets.spreadsheets.values.update({
    spreadsheetId: env.googleSheetsId,
    range: `'${sheetName}'!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: rows }
  });
  return { success: true, sheetName, rows: rows.length };
}

async function getSheetData(sheetName) {
  if (!configured()) return { success: false, skipped: true, reason: 'Google Sheets not configured', values: [] };
  const sheets = sheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: env.googleSheetsId,
    range: `'${sheetName}'!A:Z`
  });
  return { success: true, sheetName, values: response.data.values || [] };
}

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

async function syncDailyRates() {
  return retry('syncDailyRates', async () => {
    const { start, end } = todayRange();
    const rows = await prisma.dealerRateIntelligence.findMany({
      where: { parsedAt: { gte: start, lt: end } },
      orderBy: [{ parsedAt: 'desc' }, { price: 'asc' }]
    });
    return writeSheet(SHEETS.dailyRates, [
      ['Date', 'Tool', 'Plan', 'Price', 'Dealer', 'D-Code', 'Timestamp'],
      ...rows.map((row) => [
        row.parsedAt.toISOString().slice(0, 10),
        row.toolSlug,
        row.planName || row.planSlug,
        row.price,
        row.dealerName || row.dealerNumber,
        row.dealerCode || '',
        row.parsedAt.toISOString()
      ])
    ]);
  });
}

async function syncPurchases() {
  return retry('syncPurchases', async () => {
    const rows = await prisma.purchase.findMany({ include: { dealer: true, tool: true, toolPlan: true }, orderBy: { purchaseDate: 'desc' }, take: 2000 });
    return writeSheet(SHEETS.purchases, [
      ['Date', 'Tool', 'Plan', 'Type', 'Dealer', 'D-Code', 'Buy Price', 'Qty', 'Total Cost', 'Notes'],
      ...rows.map((row) => [
        row.purchaseDate.toISOString(),
        row.tool.name,
        row.toolPlan?.name || row.plan,
        row.notes?.match(/type:([a-z_]+)/i)?.[1] || '',
        row.dealer.name,
        row.dealer.tags?.dealerCode || '',
        row.buyPriceEach,
        row.quantity,
        row.totalCost,
        row.notes || ''
      ])
    ]);
  });
}

async function syncSales() {
  return retry('syncSales', async () => {
    const rows = await prisma.businessOrder.findMany({
      include: { customer: true, tool: true, plan: true, accountType: true },
      orderBy: { createdAt: 'desc' },
      take: 2000
    });
    return writeSheet(SHEETS.sales, [
      ['Date', 'Order ID', 'Customer', 'Tool', 'Plan', 'Type', 'Sell Price', 'Qty', 'Revenue', 'Profit', 'Status'],
      ...rows.map((row) => [
        row.createdAt.toISOString(),
        row.orderId,
        row.customer?.whatsapp || '',
        row.tool?.name || '',
        row.plan?.name || '',
        row.accountType?.name || '',
        row.sellPrice,
        row.quantity,
        Number(row.sellPrice || 0) * Number(row.quantity || 1),
        row.profit,
        row.status
      ])
    ]);
  });
}

async function syncPnL() {
  return retry('syncPnL', async () => {
    const { start, end } = todayRange();
    const orders = await prisma.businessOrder.findMany({
      where: { createdAt: { gte: start, lt: end } },
      include: { tool: true }
    });
    const revenue = orders.reduce((sum, row) => sum + Number(row.sellPrice || 0) * Number(row.quantity || 1), 0);
    const totalCost = orders.reduce((sum, row) => sum + Number(row.buyPrice || 0) * Number(row.quantity || 1), 0);
    const netProfit = orders.reduce((sum, row) => sum + Number(row.profit || 0), 0);
    const toolCounts = new Map();
    for (const order of orders) toolCounts.set(order.tool?.name || 'Unknown', (toolCounts.get(order.tool?.name || 'Unknown') || 0) + Number(order.quantity || 1));
    const topTool = [...toolCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '';
    const bestDealer = await prisma.dealerRateIntelligence.findFirst({
      where: { parsedAt: { gte: start, lt: end }, trustStatus: { not: 'scammer' } },
      orderBy: [{ price: 'asc' }, { parsedAt: 'desc' }]
    });
    return writeSheet(SHEETS.pnl, [
      ['Date', 'Total Revenue', 'Total Cost', 'Net Profit', 'Orders', 'Top Tool', 'Best Dealer'],
      [start.toISOString().slice(0, 10), revenue, totalCost, netProfit, orders.length, topTool, bestDealer?.dealerCode || bestDealer?.dealerName || '']
    ]);
  });
}

async function syncDealers() {
  return retry('syncDealers', async () => {
    const rows = await prisma.trustedDealer.findMany({ orderBy: { dealerCode: 'asc' } });
    return writeSheet(SHEETS.dealers, [
      ['D-Code', 'Name', 'Number', 'Tools', 'Avg Price', 'Lowest Price', 'Trust Score', 'Orders', 'Status'],
      ...rows.map((row) => [
        row.dealerCode,
        row.dealerName || '',
        row.dealerNumber,
        Array.isArray(row.toolsList) ? row.toolsList.join(', ') : '',
        row.avgPrice,
        row.lowestPrice,
        row.trustScore,
        row.ordersCompleted,
        'trusted'
      ])
    ]);
  });
}

async function syncStock() {
  return retry('syncStock', async () => {
    const rows = await prisma.stockInventory.findMany({ orderBy: [{ toolSlug: 'asc' }, { planSlug: 'asc' }, { accountType: 'asc' }] });
    const grouped = new Map();
    for (const row of rows) {
      const key = `${row.toolSlug}:${row.planSlug}`;
      const current = grouped.get(key) || { toolSlug: row.toolSlug, planSlug: row.planSlug, private: 0, warranty: 0, non_warranty: 0, low: false };
      current[row.accountType] = row.quantityAvailable;
      current.low = current.low || Number(row.quantityAvailable || 0) <= Number(row.lowStockThreshold || env.lowStockThreshold);
      grouped.set(key, current);
    }
    return writeSheet(SHEETS.stock, [
      ['Tool', 'Plan', 'Private Qty', 'Warranty Qty', 'Non-Warranty Qty', 'Low Stock Alert'],
      ...[...grouped.values()].map((row) => [row.toolSlug, row.planSlug, row.private, row.warranty, row.non_warranty, row.low ? 'YES' : 'NO'])
    ]);
  });
}

async function syncAll() {
  const results = [];
  for (const fn of [syncDailyRates, syncPurchases, syncSales, syncPnL, syncDealers, syncStock]) {
    results.push(await fn());
  }
  return {
    success: results.every((row) => row.success || row.skipped),
    sheetsId: env.googleSheetsId,
    results
  };
}

module.exports = {
  SHEETS,
  syncDailyRates,
  syncPurchases,
  syncSales,
  syncPnL,
  syncDealers,
  syncStock,
  syncAll,
  syncAllSheets: syncAll,
  getSheetData,
  clearSheet
};
