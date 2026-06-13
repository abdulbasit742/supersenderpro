const express = require('express');
const prisma = require('../services/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { parsePaymentEmail } = require('../payment/emailParser');
const { verifyPaymentNotification, manualVerifyTransaction } = require('../payment/verifier');

const router = express.Router();

router.get('/notifications', asyncHandler(async (req, res) => {
  const rows = await prisma.paymentNotification.findMany({
    orderBy: { createdAt: 'desc' },
    take: Math.min(Number(req.query.limit || 100), 500)
  });
  res.json(rows);
}));

router.post('/parse-test', asyncHandler(async (req, res) => {
  const parsed = parsePaymentEmail({
    from: req.body?.from || 'manual@test.local',
    subject: req.body?.subject || 'Manual payment test',
    body: req.body?.body || req.body?.text || '',
    date: req.body?.date || new Date()
  });
  res.json({ parsed });
}));

router.post('/verify', asyncHandler(async (req, res) => {
  const result = await verifyPaymentNotification(req.body || {});
  req.app.get('io')?.emit('payment:verified', result);
  res.status(result.success ? 200 : 202).json(result);
}));

router.post('/manual-verify', asyncHandler(async (req, res) => {
  const result = await manualVerifyTransaction(req.body?.transactionId || req.body?.txnId, req.body?.orderId || '');
  req.app.get('io')?.emit('payment:manual-verify', result);
  res.status(result.success ? 200 : 409).json(result);
}));

module.exports = router;
