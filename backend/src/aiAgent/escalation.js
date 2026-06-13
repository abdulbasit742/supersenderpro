const prisma = require('../services/prisma');
const env = require('../config/env');
const { sendWhatsAppMessage } = require('../whatsapp/baileysClient');

function shouldEscalate(intent, confidence, warrantyStatus) {
  if (intent === 'UNKNOWN' || Number(confidence || 0) < 0.65) return true;
  if (intent === 'ISSUE_REPORT' && warrantyStatus?.canClaim) return true;
  return false;
}

async function buildEscalationContext(customerId, message, orderId = '') {
  const [customer, order] = await Promise.all([
    customerId ? prisma.customer.findUnique({ where: { id: customerId } }).catch(() => null) : null,
    orderId ? prisma.businessOrder.findUnique({ where: { orderId }, include: { tool: true, plan: true, accountType: true, customer: true } }).catch(() => null) : null
  ]);
  return { customer, order, message, orderId, createdAt: new Date().toISOString() };
}

function formatEscalation(context) {
  return [
    '━━━━━━━━━━━━━━━',
    '⚠️ ADMIN ALERT',
    `Customer: ${context.customer?.whatsapp || context.order?.customer?.whatsapp || 'Unknown'}`,
    `Order: #${context.order?.orderId || context.orderId || 'N/A'}`,
    `Tool: ${context.order?.tool?.name || '-'} ${context.order?.plan?.name || ''}`,
    `Message: "${context.message || ''}"`,
    '━━━━━━━━━━━━━━━',
    `!resolve ${context.order?.orderId || 'ORD-XXXX'} [solution]`
  ].join('\n');
}

async function sendToAdmin(context) {
  const message = formatEscalation(context);
  await prisma.adminAlert.create({
    data: { type: 'ai_escalation', title: 'AI escalation', message, severity: 'warning', payload: context }
  }).catch(() => null);
  if (env.adminNumber) {
    try {
      await sendWhatsAppMessage({ to: `${env.adminNumber}@s.whatsapp.net`, message });
    } catch (error) {
      console.error('[aiAgent:sendToAdmin]', error);
    }
  }
  return { success: true, message };
}

module.exports = { shouldEscalate, buildEscalationContext, sendToAdmin, formatEscalation };
