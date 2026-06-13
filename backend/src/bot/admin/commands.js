const prisma = require('../../services/prisma');
const env = require('../../config/env');
const { normalizePhone } = require('../../utils/phone');
const { resolveIssue } = require('../../utils/warrantyChecker');
const { addToTrusted, recordTrustVote, flagSuspectedScammer } = require('../../dealerIntelligence/trustManager');
const { addStockItem, getStockSummary } = require('../../dealerIntelligence/stockManager');
const priceAnalytics = require('../../services/priceAnalytics');
const waSender = require('../../whatsapp/waSenderIntegration');
const { addGroup, removeGroup } = require('../../whatsapp/groupManager');
const { syncAll } = require('../../utils/sheetsSync');
const { money } = require('../../utils/formatter');
const { deliverOrder } = require('../../services/deliveryService');
const { manualVerifyTransaction } = require('../../payment/verifier');
const { flagScammer } = require('../../security/fraudDetection');
const { runZeroTouchJob, zeroTouchSummary, buildCustomerProfile } = require('../../zeroTouch');

const authSessions = new Map();
const AUTH_TTL_MS = 12 * 60 * 60 * 1000;

function isAdmin(number = '') {
  return normalizePhone(number) === normalizePhone(env.adminNumber);
}

function isAuthenticated(sender = '') {
  if (!env.adminAuthPassword) return true;
  return (authSessions.get(normalizePhone(sender)) || 0) > Date.now();
}

function authenticate(sender = '', password = '') {
  if (!env.adminAuthPassword) return 'Admin auth password not configured; ADMIN_NUMBER commands are enabled.';
  if (String(password || '') !== String(env.adminAuthPassword)) return '❌ Auth failed. Password ghalat hai.';
  authSessions.set(normalizePhone(sender), Date.now() + AUTH_TTL_MS);
  return '✅ Admin authenticated for 12 hours.';
}

async function approve(orderId) {
  const result = await deliverOrder(orderId, { actor: 'admin_whatsapp', source: 'admin_approve_command' });
  if (!result.success) return `⚠️ Approved nahi hua: ${result.message}`;
  return `✅ Approved ${result.order.orderId}. Credentials sent. Remaining stock: ${result.stock?.quantityAvailable ?? 'unknown'}`;
}

async function reject(orderId, reason = 'Payment not verified') {
  await prisma.businessOrder.update({ where: { orderId }, data: { status: 'cancelled', notes: reason } });
  return `❌ Rejected ${orderId}. Reason: ${reason}`;
}

async function orders() {
  const rows = await prisma.businessOrder.findMany({
    where: { status: { in: ['awaiting_payment', 'awaiting_verification', 'payment_pending'] } },
    include: { customer: true, tool: true, plan: true, accountType: true },
    orderBy: { createdAt: 'desc' },
    take: 20
  });
  if (!rows.length) return 'No pending orders.';
  return rows.map((row) => `${row.orderId} | ${row.customer.whatsapp} | ${row.tool.name} ${row.plan.name} | ${money(row.sellPrice)}`).join('\n');
}

async function stats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rows = await prisma.businessOrder.findMany({ where: { createdAt: { gte: today } } });
  const revenue = rows.reduce((sum, row) => sum + Number(row.sellPrice || 0) * Number(row.quantity || 1), 0);
  const profit = rows.reduce((sum, row) => sum + Number(row.profit || 0), 0);
  return `📊 Today\nOrders: ${rows.length}\nRevenue: ${money(revenue)}\nProfit: ${money(profit)}`;
}

async function rates() {
  const report = await priceAnalytics.getDailyPriceSummary();
  if (!report.length) return 'No dealer rates collected today.';
  return report.map((row) => `${row.tool} ${row.plan}: Low ${money(row.lowest?.price || 0)} | Avg ${money(row.average || 0)} | High ${money(row.highest?.price || 0)}`).join('\n');
}

async function sales() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const delivered = await prisma.businessOrder.findMany({
    where: { deliveryDate: { gte: today }, status: 'delivered' },
    include: { tool: true }
  });
  const revenue = delivered.reduce((sum, row) => sum + Number(row.sellPrice || 0) * Number(row.quantity || 1), 0);
  const profit = delivered.reduce((sum, row) => sum + Number(row.profit || 0), 0);
  const topTool = [...delivered.reduce((map, row) => {
    const key = row.tool?.name || 'Unknown';
    map.set(key, (map.get(key) || 0) + Number(row.quantity || 1));
    return map;
  }, new Map()).entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
  return `💰 Sales Today\nDelivered: ${delivered.length}\nRevenue: ${money(revenue)}\nProfit: ${money(profit)}\nTop tool: ${topTool}`;
}

async function updatePricing(toolInput, typeInput, priceInput) {
  const price = Number(priceInput);
  if (!toolInput || !typeInput || !Number.isFinite(price) || price <= 0) return 'Usage: !pricing tool type price';
  const tool = await prisma.tool.findFirst({
    where: { OR: [{ slug: String(toolInput).toLowerCase() }, { name: { contains: String(toolInput) } }] }
  });
  const accountType = await prisma.accountType.findUnique({ where: { name: String(typeInput) } });
  if (!tool || !accountType) return 'Tool/type not found. Example: !pricing chatgpt private 999';
  const plans = await prisma.toolPlan.findMany({ where: { toolId: tool.id, active: true } });
  for (const plan of plans) {
    await prisma.pricing.upsert({
      where: { toolId_planId_accountTypeId: { toolId: tool.id, planId: plan.id, accountTypeId: accountType.id } },
      update: { price },
      create: { toolId: tool.id, planId: plan.id, accountTypeId: accountType.id, price, policySummary: accountType.policySummary }
    });
  }
  return `✅ Pricing updated: ${tool.name} ${accountType.name} = ${money(price)} (${plans.length} plans)`;
}

async function help() {
  return [
    '!auth password',
    '!verify TXN_ID [ORDERID]',
    '!deliver ORDERID',
    '!approve ORDERID',
    '!reject ORDERID reason',
    '!replace ORDERID',
    '!resolve ORDERID solution',
    '!stock',
    '!addkey tool type dealerCode email:pass',
    '!addstock tool email password type',
    '!pricing tool type price',
    '!orders',
    '!sales',
    '!scam number reason',
    '!scammer number reason',
    '!broadcast message',
    '!addgroup GROUP_ID CUSTOMER|DEALER name',
    '!removegroup GROUP_ID',
    '!stats',
    '!rates',
    '!profit tool buy sell',
    '!trust number',
    '!untrust number',
    '!pending',
    '!sync',
    '!autopilot [job]',
    '!autopilotstatus',
    '!memory number',
    '!help'
  ].join('\n');
}

async function logUnauthorized(sender, text) {
  console.warn('[adminCommand:unauthorized]', { sender, text });
  await prisma.adminAlert.create({
    data: {
      type: 'unauthorized_admin_command',
      title: `Unauthorized command from ${sender}`,
      message: String(text || '').slice(0, 250),
      severity: 'warning',
      payload: { sender, text }
    }
  }).catch(() => null);
}

async function handleAdminCommand(text = '', sender = '') {
  if (!isAdmin(sender)) {
    await logUnauthorized(sender, text);
    return '';
  }

  const parts = text.trim().split(/\s+/);
  const cmd = (parts[0] || '').toLowerCase();

  try {
    if (cmd === '!auth') return authenticate(sender, parts.slice(1).join(' '));
    if (cmd === '!help') return help();
    if (!isAuthenticated(sender)) return '🔐 Admin auth required. Pehle `!auth password` bhejein.';

    if (cmd === '!verify') {
      const result = await manualVerifyTransaction(parts[1], parts[2] || '');
      return result.success ? `✅ TXN verified and delivered: ${result.order?.orderId || parts[2] || ''}` : `❌ Verify failed: ${result.message}`;
    }
    if (cmd === '!deliver') {
      const result = await deliverOrder(parts[1], { actor: 'admin_whatsapp', source: 'manual_deliver_command' });
      return result.success ? `✅ Delivered ${result.order.orderId}` : `❌ Delivery failed: ${result.message}`;
    }
    if (cmd === '!approve') return approve(parts[1]);
    if (cmd === '!reject') return reject(parts[1], parts.slice(2).join(' ') || 'Rejected by admin');
    if (cmd === '!replace') return (await resolveIssue(parts[1], 'replacement', 'Replacement issued by admin')).message;
    if (cmd === '!resolve') return (await resolveIssue(parts[1], 'issue', parts.slice(2).join(' ') || 'Resolved by admin')).message;
    if (cmd === '!stock') return (await getStockSummary()).text;
    if (cmd === '!addkey') {
      const [tool, type, dealerCode] = parts.slice(1, 4);
      const raw = parts.slice(4).join(' ');
      const [accountEmail, accountPass] = raw.split(':');
      const result = await addStockItem(tool, type, dealerCode, { accountEmail, accountPass, raw });
      syncAll().catch(() => {});
      return result.success ? `✅ Stock key added for ${tool} ${type}` : `❌ ${result.message}`;
    }
    if (cmd === '!addstock') {
      const [tool, accountEmail, accountPass, type = 'private'] = parts.slice(1, 5);
      const result = await addStockItem(tool, type, 'admin', { accountEmail, accountPass, raw: `${accountEmail}:${accountPass}` });
      syncAll().catch(() => {});
      return result.success ? `✅ Stock added for ${tool} ${type}` : `❌ ${result.message}`;
    }
    if (cmd === '!pricing') return updatePricing(parts[1], parts[2], parts[3]);
    if (cmd === '!orders') return orders();
    if (cmd === '!sales') return sales();
    if (cmd === '!scam' || cmd === '!scammer') {
      await flagScammer(parts[1], parts.slice(2).join(' ') || 'Flagged by admin', text);
      await flagSuspectedScammer(parts[1], parts.slice(2).join(' ') || 'Flagged by admin');
      return `🚫 Scammer flagged: ${parts[1]}`;
    }
    if (cmd === '!broadcast') {
      const message = parts.slice(1).join(' ');
      const result = await waSender.broadcastToGroups(message, env.customerGroups);
      return `Broadcast sent: ${result.sent.length}, failed: ${result.failed.length}`;
    }
    if (cmd === '!addgroup') {
      const [groupId, type = 'CUSTOMER'] = parts.slice(1, 3);
      const name = parts.slice(3).join(' ');
      const group = await addGroup(groupId, type.toUpperCase(), name);
      return `Group saved: ${group.name} (${group.type})`;
    }
    if (cmd === '!removegroup') {
      const result = await removeGroup(parts[1]);
      return result.success ? `Group removed: ${result.group.name}` : result.message;
    }
    if (cmd === '!stats') return stats();
    if (cmd === '!rates') return rates();
    if (cmd === '!profit') {
      const buy = Number(parts[2]);
      const sell = Number(parts[3]);
      const pct = buy ? ((sell - buy) / buy) * 100 : 0;
      return `${parts[1]} profit: ${money(sell - buy)} (${pct.toFixed(1)}%)`;
    }
    if (cmd === '!trust') {
      const dealer = await addToTrusted(parts[1]);
      return `✅ Trusted ${dealer.dealerCode} ${dealer.dealerNumber}`;
    }
    if (cmd === '!untrust') {
      await prisma.trustedDealer.delete({ where: { dealerNumber: normalizePhone(parts[1]) } });
      return `Removed trusted dealer ${parts[1]}`;
    }
    if (cmd === '!pending') {
      const rows = await prisma.trustPending.findMany({ where: { status: 'pending' }, take: 20 });
      return rows.map((row) => `${row.dealerNumber} YES:${row.yesVotes} NO:${row.noVotes}`).join('\n') || 'No pending trust votes.';
    }
    if (cmd === '!sync') {
      const result = await syncAll();
      return result.success ? '✅ Google Sheets synced.' : `Sheets skipped: ${result.reason || result.message}`;
    }
    if (cmd === '!autopilot') {
      const job = parts[1] || 'daily_zero_touch_summary';
      const result = await runZeroTouchJob(job, {});
      return `Zero-Touch job done: ${job}\n${JSON.stringify(result).slice(0, 1200)}`;
    }
    if (cmd === '!autopilotstatus') {
      const summary = await zeroTouchSummary();
      return JSON.stringify(summary.daily || summary).slice(0, 1500);
    }
    if (cmd === '!memory') {
      const profile = await buildCustomerProfile(parts[1]);
      if (!profile) return 'Customer memory not found.';
      return [
        `Customer: ${profile.customer.name} ${profile.customer.whatsapp}`,
        `Tier: ${profile.tier}`,
        `Preferred tools: ${(profile.preferredTools || []).join(', ') || '-'}`,
        `Payment: ${profile.preferredPaymentMethod || '-'}`,
        `Orders: ${profile.orders.length}`,
        `Revenue: ${money(profile.totalRevenue)}`
      ].join('\n');
    }
    if (/^trusted\s+(yes|no)/i.test(text)) {
      const vote = text.match(/^trusted\s+(yes|no)\s+(.+)/i);
      const result = await recordTrustVote(sender, vote?.[2], vote?.[1]);
      return `Vote saved. YES:${result.yesVotes || 0} NO:${result.noVotes || 0}`;
    }
    return '';
  } catch (error) {
    console.error('[adminCommand]', error);
    return `Command failed: ${error.message}`;
  }
}

module.exports = { handleAdminCommand, isAdmin };
