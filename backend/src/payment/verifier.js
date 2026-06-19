const prisma = require('../services/prisma');
const env = require('../config/env');
const { normalizePhone } = require('../utils/phone');
const { sendWhatsAppMessage } = require('../whatsapp/baileysClient');
const { hashValue, maskReference } = require('../security/encryption');
const { isProcessed, markProcessed } = require('../utils/transactionStore');
const { detectPaymentFraud } = require('../security/fraudDetection');
const { deliverOrder } = require('../services/deliveryService');
const { auditLog } = require('../services/auditLog');
const { money } = require('../utils/formatter');

const AMOUNT_TOLERANCE = 5;
const PAYMENT_WINDOW_MS = 24 * 60 * 60 * 1000;

function normalizeParsed(input = {}) {
  const transactionId = String(input.transactionId || input.txnId || input.reference || input.ref || '').trim();
  const amount = Number(input.amount || input.paidAmount || 0);
  return {
    transactionId,
    txnHash: input.txnHash || (transactionId ? hashValue(transactionId) : ''),
    txnReferenceMasked: input.txnReferenceMasked || maskReference(transactionId),
    amount,
    senderMobile: normalizePhone(input.senderMobile || input.senderNumber || ''),
    paymentMethod: input.paymentMethod || 'Unknown',
    paidAt: input.paidAt ? new Date(input.paidAt) : new Date(),
    emailFrom: input.emailFrom || '',
    emailSubject: input.emailSubject || '',
    rawSnippet: String(input.rawSnippet || input.raw || '').slice(0, 1500)
  };
}

function orderAmount(order) {
  return Number(order.sellPrice || 0) * Number(order.quantity || 1);
}

function isWithinTolerance(order, amount) {
  return Math.abs(orderAmount(order) - amount) <= AMOUNT_TOLERANCE;
}

async function sendPaymentAlert(parsed, status, details = '') {
  const message = [
    '💳 PAYMENT EMAIL PARSED',
    `Method: ${parsed.paymentMethod}`,
    `Amount: ${money(parsed.amount)}`,
    `TXN: ${parsed.txnReferenceMasked}`,
    parsed.senderMobile ? `Sender: ${parsed.senderMobile}` : '',
    `Status: ${status}`,
    details
  ].filter(Boolean).join('\n');
  await prisma.adminAlert.create({
    data: {
      type: 'payment_notification',
      title: `Payment ${status}: ${parsed.txnReferenceMasked}`,
      message,
      severity: status === 'verified' ? 'success' : 'warning',
      payload: { parsed, details }
    }
  }).catch(() => null);
  if (env.adminNumber) {
    await sendWhatsAppMessage({ to: `${env.adminNumber}@s.whatsapp.net`, sessionKey: env.adminSessionId, message })
      .catch((error) => console.error('[payment:adminAlert]', error));
  }
}

async function findMatchingOrder(parsed) {
  const paidAt = parsed.paidAt instanceof Date && !Number.isNaN(parsed.paidAt.getTime()) ? parsed.paidAt : new Date();
  const earliest = new Date(paidAt.getTime() - PAYMENT_WINDOW_MS);
  const latest = new Date(paidAt.getTime() + 5 * 60 * 1000);
  const candidates = await prisma.businessOrder.findMany({
    where: {
      status: { in: ['awaiting_payment', 'awaiting_verification', 'payment_pending'] },
      createdAt: { gte: earliest, lte: latest }
    },
    include: { customer: true, tool: true, plan: true, accountType: true },
    orderBy: { createdAt: 'desc' },
    take: 100
  });
  const amountMatches = candidates.filter((order) => isWithinTolerance(order, parsed.amount));
  if (env.senderNumberVerification && parsed.senderMobile) {
    return amountMatches.find((order) => normalizePhone(order.customer?.whatsapp) === parsed.senderMobile) || null;
  }
  return amountMatches.find((order) => parsed.senderMobile && normalizePhone(order.customer?.whatsapp) === parsed.senderMobile) || amountMatches[0] || null;
}

async function createNotification(parsed, status, matchedOrderId = '', reviewReason = '', fraudScore = 0) {
  return prisma.paymentNotification.create({
    data: {
      txnHash: parsed.txnHash,
      txnReferenceMasked: parsed.txnReferenceMasked,
      amount: parsed.amount,
      senderMobile: parsed.senderMobile || null,
      paymentMethod: parsed.paymentMethod,
      paidAt: parsed.paidAt,
      emailFrom: parsed.emailFrom || null,
      emailSubject: parsed.emailSubject || null,
      rawSnippet: parsed.rawSnippet || null,
      status,
      matchedOrderId: matchedOrderId || null,
      fraudScore,
      reviewReason: reviewReason || null
    }
  });
}

async function verifyPaymentNotification(input = {}) {
  const parsed = normalizeParsed(input);
  if (!parsed.transactionId || !parsed.txnHash || !Number.isFinite(parsed.amount) || parsed.amount <= 0) {
    await sendPaymentAlert(parsed, 'manual_review', 'Missing transaction ID or amount.');
    return { success: false, status: 'manual_review', reason: 'Missing transaction ID or amount', parsed };
  }

  const duplicate = await prisma.paymentNotification.findUnique({ where: { txnHash: parsed.txnHash } }).catch(() => null);
  const duplicateOrder = await prisma.businessOrder.findFirst({ where: { paymentTxnHash: parsed.txnHash } }).catch(() => null);
  if (duplicate || duplicateOrder || isProcessed(parsed.txnHash)) {
    await sendPaymentAlert(parsed, 'duplicate_rejected', `Already processed${duplicateOrder ? ` for ${duplicateOrder.orderId}` : ` as ${duplicate?.status || 'unknown'}`}.`);
    return { success: false, status: 'duplicate_rejected', notification: duplicate, order: duplicateOrder, reason: 'Duplicate transaction ID' };
  }

  const fraud = await detectPaymentFraud({ senderMobile: parsed.senderMobile, txnHash: parsed.txnHash });
  const order = await findMatchingOrder(parsed);
  if (!order) {
    const notification = await createNotification(parsed, 'manual_review', '', 'No pending order matched amount/date/sender', fraud.score);
    await sendPaymentAlert(parsed, 'manual_review', `No matching pending order. Fraud score: ${fraud.score}. ${fraud.reasons.join(', ')}`);
    await auditLog({ actor: 'payment_engine', action: 'payment_manual_review', entity: 'PaymentNotification', entityId: notification.id, metadata: { fraud } });
    return { success: false, status: 'manual_review', notification, fraud, reason: 'No matching pending order' };
  }

  if (fraud.blocked || fraud.score >= 80) {
    const notification = await createNotification(parsed, 'manual_review', order.orderId, fraud.reasons.join(', ') || 'High fraud score', fraud.score);
    await prisma.businessOrder.update({ where: { orderId: order.orderId }, data: { status: 'awaiting_verification' } }).catch(() => null);
    await sendPaymentAlert(parsed, 'manual_review', `Matched ${order.orderId}, but fraud review needed: ${fraud.reasons.join(', ')}`);
    return { success: false, status: 'manual_review', notification, matchedOrder: order, fraud };
  }

  const notification = await createNotification(parsed, 'matched', order.orderId, '', fraud.score);
  const delivery = await deliverOrder(order.orderId, {
    actor: 'payment_engine',
    source: 'email_payment_parser',
    payment: {
      paymentMethod: parsed.paymentMethod,
      paymentTxnHash: parsed.txnHash,
      paymentTxnLast4: parsed.transactionId.slice(-4),
      paymentSenderNumber: parsed.senderMobile || null,
      paymentReceivedAt: parsed.paidAt,
      paymentVerifiedAt: new Date()
    }
  });

  const status = delivery.success ? 'verified' : 'manual_review';
  const updated = await prisma.paymentNotification.update({
    where: { id: notification.id },
    data: {
      status,
      reviewReason: delivery.success ? null : delivery.message
    }
  });
  await sendPaymentAlert(parsed, status, delivery.success ? `Order ${order.orderId} delivered automatically.` : `Order ${order.orderId} matched, delivery blocked: ${delivery.message}`);
  await auditLog({
    actor: 'payment_engine',
    action: delivery.success ? 'payment_verified_delivery' : 'payment_delivery_blocked',
    entity: 'BusinessOrder',
    entityId: order.orderId,
    metadata: { notificationId: updated.id, fraud, delivery }
  });
  // Mark transaction as processed to prevent replay
  if (delivery.success) {
    markProcessed(parsed.txnHash);
  }
  return { success: delivery.success, status, notification: updated, matchedOrder: order, delivery, fraud };
}

async function manualVerifyTransaction(transactionId, orderId = '') {
  const txnHash = hashValue(transactionId);
  const notification = await prisma.paymentNotification.findUnique({ where: { txnHash } });
  if (!notification) return { success: false, message: `TXN not found: ${maskReference(transactionId)}` };
  const targetOrderId = orderId || notification.matchedOrderId;
  if (!targetOrderId) return { success: false, message: 'No matched order. Pass order ID: !verify TXN_ID ORD-123456' };
  const delivery = await deliverOrder(targetOrderId, {
    actor: 'admin_whatsapp',
    source: 'manual_txn_verify',
    payment: {
      paymentMethod: notification.paymentMethod,
      paymentTxnHash: notification.txnHash,
      paymentTxnLast4: String(transactionId).slice(-4),
      paymentSenderNumber: notification.senderMobile,
      paymentReceivedAt: notification.paidAt || notification.createdAt,
      paymentVerifiedAt: new Date()
    }
  });
  await prisma.paymentNotification.update({
    where: { id: notification.id },
    data: { status: delivery.success ? 'verified' : 'manual_review', matchedOrderId: targetOrderId, reviewReason: delivery.success ? null : delivery.message }
  });
  return delivery;
}

module.exports = {
  verifyPaymentNotification,
  manualVerifyTransaction,
  normalizeParsed,
  findMatchingOrder
};
