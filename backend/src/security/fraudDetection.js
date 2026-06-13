const prisma = require('../services/prisma');
const { normalizePhone } = require('../utils/phone');

async function detectPaymentFraud({ senderMobile, txnHash, customerNumber }) {
  const reasons = [];
  let score = 0;
  if (txnHash) {
    const duplicate = await prisma.paymentNotification.findUnique({ where: { txnHash } }).catch(() => null);
    const duplicateOrder = await prisma.businessOrder.findFirst({ where: { paymentTxnHash: txnHash } }).catch(() => null);
    if (duplicate || duplicateOrder) {
      score += 80;
      reasons.push('Duplicate transaction ID used');
    }
  }
  const normalized = normalizePhone(senderMobile || customerNumber || '');
  if (normalized) {
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const count = await prisma.paymentNotification.count({
      where: { senderMobile: normalized, createdAt: { gte: since } }
    }).catch(() => 0);
    if (count >= 3) {
      score += 45;
      reasons.push('Same number paid 3+ times in 1 hour');
    }
    const scammer = await prisma.scammer.findUnique({ where: { number: normalized } }).catch(() => null);
    if (scammer) {
      score += 100;
      reasons.push('Sender is marked scammer');
    }
    const customer = await prisma.customer.findUnique({ where: { whatsapp: normalized } }).catch(() => null);
    if (customer?.scammerFlag) {
      score += 100;
      reasons.push('Customer has scammer flag');
    }
  }
  return { score: Math.min(100, score), reasons, blocked: score >= 100 };
}

async function flagScammer(number, reason, evidenceMessage = '') {
  const normalized = normalizePhone(number);
  if (!normalized) return null;
  await prisma.customer.updateMany({ where: { whatsapp: normalized }, data: { scammerFlag: true } }).catch(() => null);
  return prisma.scammer.upsert({
    where: { number: normalized },
    update: { reason, evidenceMessage },
    create: { number: normalized, reason, evidenceMessage }
  });
}

module.exports = {
  detectPaymentFraud,
  flagScammer
};
