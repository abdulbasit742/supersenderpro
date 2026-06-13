const express = require('express');
const prisma = require('../services/prisma');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

const workflowNames = [
  'dealer-rate-collection',
  'daily-broadcast',
  'payment-verification',
  'customer-followup'
];

router.get('/workflows', (req, res) => {
  res.json(workflowNames.map((name) => ({
    name,
    importPath: `n8n-workflows/${name}.json`
  })));
});

async function receiveWebhook(req, res) {
  const event = req.body?.event || req.query.event || 'generic';
  const payload = req.body?.payload || req.body || {};
  const command = req.body?.command || payload.command || '';
  if (command) {
    req.app.get('io')?.emit('n8n:command', { command, payload, at: new Date().toISOString() });
  }
  await prisma.adminAlert.create({
    data: {
      type: `n8n_${event}`,
      title: `n8n event: ${event}`,
      message: `n8n workflow event received: ${event}`,
      severity: 'info',
      payload
    }
  }).catch(() => null);
  req.app.get('io')?.emit('n8n:event', { event, payload, at: new Date().toISOString() });
  res.json({ success: true, event });
}

router.post('/', asyncHandler(receiveWebhook));
router.post('/webhook', asyncHandler(receiveWebhook));

router.post('/order-created', asyncHandler(async (req, res) => {
  const order = req.body?.order || req.body || {};
  await prisma.adminAlert.create({
    data: {
      type: 'order_created',
      title: `New order ${order.orderId || ''}`.trim(),
      message: `New AI tools order from ${order.customerWhatsapp || order.phone || 'customer'}`,
      severity: 'success',
      payload: order
    }
  }).catch(() => null);
  req.app.get('io')?.emit('business:order:n8n', order);
  res.json({ success: true });
}));

module.exports = router;
