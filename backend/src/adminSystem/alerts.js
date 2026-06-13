const prisma = require('../services/prisma');
const env = require('../config/env');
const { sendWhatsAppMessage } = require('../whatsapp/baileysClient');
const { money, line } = require('../utils/formatter');
const { getRemainingSupport } = require('../utils/warrantyChecker');

async function persistAndSend({ type, title, message, severity = 'info', payload = {} }) {
  await prisma.adminAlert.create({ data: { type, title, message, severity, payload } }).catch(() => null);
  if (env.adminNumber) {
    try {
      await sendWhatsAppMessage({ to: `${env.adminNumber}@s.whatsapp.net`, message });
    } catch (error) {
      console.error('[adminAlerts:sendWhatsApp]', error);
    }
  }
  return { success: true, message };
}

async function sendNewOrderAlert(order) {
  const message = [
    line(),
    `🛒 NEW ORDER #${order.orderId}`,
    `👤 ${order.customer?.name || order.customerName || ''} ${order.customer?.whatsapp || order.customerWhatsapp || ''}`.trim(),
    `🤖 ${order.tool?.name || order.toolSlug || ''} — ${order.accountType?.name || order.accountType || ''}`.trim(),
    `💰 ${money(Number(order.sellPrice || 0) * Number(order.quantity || 1))}`,
    order.paymentScreenshot ? '📸 Screenshot received' : '📸 Screenshot pending',
    `!approve ${order.orderId} | !reject ${order.orderId}`,
    line()
  ].join('\n');
  return persistAndSend({ type: 'new_order', title: `New order ${order.orderId}`, message, severity: 'success', payload: order });
}

async function sendIssueAlert(issue) {
  const order = issue.order || await prisma.businessOrder.findUnique({
    where: { orderId: issue.orderId },
    include: { customer: true, tool: true, plan: true, accountType: true }
  }).catch(() => null);
  const remaining = order ? await getRemainingSupport(order.orderId) : { replacements: '0/1', issues: '0/2' };
  const message = [
    line(),
    '⚠️ ISSUE ESCALATED',
    `👤 ${order?.customer?.whatsapp || issue.customer || 'Unknown'}`,
    `🛒 Order: ${order?.orderId || issue.orderId} (${order?.tool?.name || ''} ${order?.accountType?.name || ''})`,
    `🔧 Problem: ${issue.description || issue.message || ''}`,
    `📊 Warranty: ${remaining.replacements} replace, ${remaining.issues} issues`,
    `!resolve ${order?.orderId || issue.orderId} [solution]`,
    `!replace ${order?.orderId || issue.orderId}`,
    line()
  ].join('\n');
  return persistAndSend({ type: 'issue', title: `Issue ${order?.orderId || issue.orderId}`, message, severity: 'warning', payload: issue });
}

async function sendLowStockAlert(tool, type, qty) {
  return persistAndSend({
    type: 'low_stock',
    title: `${tool} ${type} low stock`,
    message: `⚠️ LOW STOCK\n${tool} ${type}\nAvailable: ${qty}`,
    severity: Number(qty) <= 0 ? 'danger' : 'warning',
    payload: { tool, type, qty }
  });
}

async function sendTrustAlert(dealerNumber, votes = {}) {
  return persistAndSend({
    type: 'trust_vote',
    title: `Trust vote: ${dealerNumber}`,
    message: `Dealer trust update\n${dealerNumber}\nYES: ${votes.yesVotes || 0}\nNO: ${votes.noVotes || 0}\nStatus: ${votes.status || 'pending'}`,
    severity: 'info',
    payload: { dealerNumber, votes }
  });
}

async function sendScamAlert(number, evidence = '') {
  return persistAndSend({
    type: 'scammer',
    title: `Scammer flagged: ${number}`,
    message: `🚫 SCAM ALERT\nNumber: ${number}\nEvidence: ${evidence || '-'}`,
    severity: 'danger',
    payload: { number, evidence }
  });
}

async function sendDailyReport() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const orders = await prisma.businessOrder.findMany({ where: { createdAt: { gte: today } }, include: { tool: true } });
  const revenue = orders.reduce((sum, row) => sum + Number(row.sellPrice || 0) * Number(row.quantity || 1), 0);
  const profit = orders.reduce((sum, row) => sum + Number(row.profit || 0), 0);
  const message = [
    line(),
    '📊 DAILY SALES SUMMARY',
    `Orders: ${orders.length}`,
    `Revenue: ${money(revenue)}`,
    `Profit: ${money(profit)}`,
    `Pending: ${orders.filter((row) => /pending|awaiting/i.test(row.status)).length}`,
    line()
  ].join('\n');
  return persistAndSend({ type: 'daily_report', title: 'Daily sales summary', message, severity: 'info', payload: { revenue, profit, orders: orders.length } });
}

async function sendZeroTouchAlert(title, details = '', payload = {}) {
  const message = [
    line(),
    '🧠 ZERO-TOUCH ORDER ENGINE',
    title,
    details,
    line()
  ].filter(Boolean).join('\n');
  return persistAndSend({ type: 'zero_touch', title, message, severity: 'info', payload });
}

module.exports = {
  persistAndSend,
  sendNewOrderAlert,
  sendIssueAlert,
  sendLowStockAlert,
  sendDailyReport,
  sendTrustAlert,
  sendScamAlert,
  sendZeroTouchAlert
};
