const express = require('express');
const prisma = require('../services/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { normalizePhone } = require('../utils/phone');
const { classifyQuery, answerFromKnowledge, resolveIssueWithAgent, buildAdminEscalation } = require('../services/aiAgent');
const { checkEligibility } = require('../services/warrantyChecker');
const { triggerWorkflow } = require('../services/n8nClient');
const { sendNewOrderAlert } = require('../adminSystem/alerts');
const { syncStock } = require('../utils/sheetsSync');
const { deliverOrder } = require('../services/deliveryService');
const { GIVEAWAYS } = require('../config/giveaways');
const { getDynamicPriceForPlan, getDynamicAvailability } = require('../zeroTouch/pricing');
const { updateMemoryAfterMessage } = require('../zeroTouch/memory');

const router = express.Router();

function orderId() {
  return `ORD-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 900 + 100)}`;
}

async function availabilityRows() {
  const rows = await prisma.pricing.findMany({
    include: { tool: true, plan: true, accountType: true },
    orderBy: [{ tool: { name: 'asc' } }, { plan: { name: 'asc' } }, { accountType: { sortOrder: 'asc' } }]
  });
  const stock = await prisma.stockInventory.findMany();
  const stockMap = new Map(stock.map((row) => [`${row.toolSlug}:${row.planSlug}:${row.accountType}`, row]));
  return rows.map((row) => {
    const inv = stockMap.get(`${row.tool.slug}:${row.plan.slug}:${row.accountType.name}`);
    const slots = Math.max(Number(inv?.quantityAvailable || 0), Number(row.manualSlots || 0));
    return {
      tool: row.tool.name,
      toolSlug: row.tool.slug,
      plan: row.plan.name,
      planSlug: row.plan.slug,
      accountType: row.accountType.name,
      accountLabel: row.accountType.label,
      price: row.price,
      limitedTime: row.isLimitedTime,
      limitedLabel: row.limitedLabel,
      policySummary: row.policySummary || row.accountType.policySummary,
      slots,
      inStock: slots > 0,
      low: slots > 0 && slots <= Number(inv?.lowStockThreshold || 3)
    };
  });
}

router.get('/overview', asyncHandler(async (req, res) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const [orders, pendingOrders, trustedDealers, pendingTrust, lowStock, alerts] = await Promise.all([
    prisma.businessOrder.findMany({ where: { createdAt: { gte: start } } }),
    prisma.businessOrder.count({ where: { status: { in: ['awaiting_payment', 'awaiting_verification'] } } }),
    prisma.trustedDealer.count(),
    prisma.trustPending.count({ where: { status: 'pending' } }),
    prisma.stockInventory.findMany({ where: { quantityAvailable: { lte: Number(process.env.LOW_STOCK_THRESHOLD || 3) } } }),
    prisma.adminAlert.findMany({ where: { read: false }, orderBy: { createdAt: 'desc' }, take: 10 }).catch(() => [])
  ]);
  res.json({
    todayRevenue: orders.reduce((sum, row) => sum + Number(row.sellPrice || 0) * Number(row.quantity || 1), 0),
    todayProfit: orders.reduce((sum, row) => sum + Number(row.profit || 0), 0),
    todayOrders: orders.length,
    pendingOrders,
    trustedDealers,
    pendingTrust,
    lowStockCount: lowStock.length,
    alerts
  });
}));

router.get('/availability', asyncHandler(async (req, res) => {
  const rows = await getDynamicAvailability(req.query.phone || '').catch(() => availabilityRows());
  res.json(req.query.tool ? rows.filter((row) => row.toolSlug === String(req.query.tool)) : rows);
}));

router.get('/stock-inventory', asyncHandler(async (req, res) => {
  res.json(await prisma.stockInventory.findMany({ orderBy: [{ quantityAvailable: 'asc' }, { toolSlug: 'asc' }, { planSlug: 'asc' }] }));
}));

router.post('/stock-inventory', asyncHandler(async (req, res) => {
  const body = req.body || {};
  const quantity = Math.max(0, Number(body.quantityAvailable ?? body.quantity ?? 0));
  const row = await prisma.stockInventory.upsert({
    where: {
      toolSlug_planSlug_accountType: {
        toolSlug: body.toolSlug,
        planSlug: body.planSlug,
        accountType: body.accountType || 'private'
      }
    },
    update: {
      quantityAvailable: quantity,
      quantityTotal: Math.max(quantity, Number(body.quantityTotal || quantity)),
      primaryDealerCode: body.primaryDealerCode || undefined,
      backupDealerCode: body.backupDealerCode || undefined,
      lastRestockedDate: new Date(),
      lastRestockedBy: body.lastRestockedBy || body.primaryDealerCode || 'admin',
      lowStockThreshold: Number(body.lowStockThreshold || 3),
      autoReorder: body.autoReorder !== false
    },
    create: {
      toolSlug: body.toolSlug,
      planSlug: body.planSlug,
      accountType: body.accountType || 'private',
      quantityAvailable: quantity,
      quantityTotal: Math.max(quantity, Number(body.quantityTotal || quantity)),
      primaryDealerCode: body.primaryDealerCode || null,
      backupDealerCode: body.backupDealerCode || null,
      lastRestockedDate: new Date(),
      lastRestockedBy: body.lastRestockedBy || body.primaryDealerCode || 'admin',
      lowStockThreshold: Number(body.lowStockThreshold || 3),
      autoReorder: body.autoReorder !== false
    }
  });
  if (quantity > 0) {
    const plan = await prisma.toolPlan.findFirst({ where: { tool: { slug: body.toolSlug }, slug: body.planSlug }, include: { tool: true } });
    await prisma.notifyMe.updateMany({
      where: { toolId: plan?.toolId || '', planId: plan?.id || null, accountType: body.accountType || 'private', status: 'waiting' },
      data: { status: 'ready_to_notify' }
    }).catch(() => null);
  }
  req.app.get('io')?.emit('business:stock', row);
  syncStock().catch(() => {});
  res.status(201).json(row);
}));

router.get('/orders', asyncHandler(async (req, res) => {
  const rows = await prisma.businessOrder.findMany({
    include: { customer: true, tool: true, plan: true, accountType: true, issues: { orderBy: { createdAt: 'desc' } } },
    orderBy: { createdAt: 'desc' },
    take: Number(req.query.limit || 200)
  });
  res.json(rows);
}));

router.post('/orders', asyncHandler(async (req, res) => {
  const body = req.body || {};
  const phone = normalizePhone(body.customerWhatsapp || body.phone || body.whatsapp);
  const [plan, accountType] = await Promise.all([
    prisma.toolPlan.findFirst({ where: { tool: { slug: body.toolSlug || body.tool }, slug: body.planSlug || body.plan }, include: { tool: true } }),
    prisma.accountType.findUnique({ where: { name: body.accountType || body.type || 'private' } })
  ]);
  if (!phone || !plan || !accountType) return res.status(400).json({ error: 'valid customer phone, tool/plan and accountType are required' });
  const pricing = await prisma.pricing.findFirst({ where: { planId: plan.id, accountTypeId: accountType.id } });
  const customer = await prisma.customer.upsert({
    where: { whatsapp: phone },
    update: { name: body.customerName || body.name || 'Customer' },
    create: { whatsapp: phone, name: body.customerName || body.name || 'Customer' }
  });
  const bestRate = await prisma.dealerRateIntelligence.findFirst({
    where: { toolSlug: plan.tool.slug, planSlug: plan.slug, trustStatus: { not: 'scammer' } },
    orderBy: [{ price: 'asc' }, { parsedAt: 'desc' }]
  });
  const qty = Math.max(1, Number(body.quantity || 1));
  const dynamicPrice = await getDynamicPriceForPlan({
    toolSlug: plan.tool.slug,
    planSlug: plan.slug,
    accountType: accountType.name,
    customerPhone: phone
  }).catch(() => null);
  const sellPrice = Number(body.sellPrice || dynamicPrice?.price || pricing?.price || plan.defaultSellPrice || 0);
  const buyPrice = Number(body.buyPrice || bestRate?.price || 0);
  const order = await prisma.businessOrder.create({
    data: {
      orderId: body.orderId || orderId(),
      customerId: customer.id,
      toolId: plan.tool.id,
      planId: plan.id,
      accountTypeId: accountType.id,
      quantity: qty,
      sellPrice,
      buyPrice,
      profit: (sellPrice - buyPrice) * qty,
      status: body.status || 'awaiting_payment',
      renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      policySnapshot: pricing?.policySummary || accountType.policySummary
    },
    include: { customer: true, tool: true, plan: true, accountType: true }
  });
  req.app.get('io')?.emit('business:order', order);
  updateMemoryAfterMessage(phone, `Order created: ${plan.tool.name} ${plan.name}`, 'ORDER').catch(() => {});
  sendNewOrderAlert(order).catch(() => {});
  triggerWorkflow('order_created', order).catch(() => {});
  res.status(201).json(order);
}));

router.put('/orders/:orderId/:action', asyncHandler(async (req, res) => {
  const action = req.params.action;
  const order = await prisma.businessOrder.findUnique({
    where: { orderId: req.params.orderId },
    include: { customer: true, tool: true, plan: true, accountType: true }
  });
  if (!order) return res.status(404).json({ error: 'Order not found' });
  const data = {};
  let delivery = null;
  if (action === 'approve') {
    delivery = await deliverOrder(order.orderId, { actor: 'dashboard_admin', source: 'business_api_approve' });
    if (!delivery.success) return res.status(409).json({ error: delivery.message, code: delivery.code || 'DELIVERY_FAILED' });
    return res.json({ ...delivery.order, delivery });
  }
  if (action === 'reject') Object.assign(data, { status: 'cancelled', notes: req.body?.reason || order.notes });
  if (action === 'replace') Object.assign(data, { warrantyReplacementsUsed: { increment: 1 }, notes: req.body?.notes || order.notes });
  const updated = await prisma.businessOrder.update({ where: { orderId: req.params.orderId }, data, include: { customer: true, tool: true, plan: true, accountType: true } });
  res.json({ ...updated, delivery });
}));

router.post('/notify-me', asyncHandler(async (req, res) => {
  const body = req.body || {};
  const phone = normalizePhone(body.phone || body.whatsapp);
  const plan = await prisma.toolPlan.findFirst({ where: { tool: { slug: body.toolSlug || body.tool }, slug: body.planSlug || body.plan }, include: { tool: true } });
  if (!phone || !plan) return res.status(400).json({ error: 'phone and tool/plan are required' });
  const customer = await prisma.customer.upsert({
    where: { whatsapp: phone },
    update: { name: body.name || 'Customer' },
    create: { whatsapp: phone, name: body.name || 'Customer' }
  });
  const row = await prisma.notifyMe.create({
    data: { phone, customerId: customer.id, toolId: plan.tool.id, planId: plan.id, accountType: body.accountType || 'private' }
  });
  res.status(201).json(row);
}));

router.get('/notify-me', asyncHandler(async (req, res) => {
  res.json(await prisma.notifyMe.findMany({ include: { customer: true, tool: true, plan: true }, orderBy: { createdAt: 'desc' } }));
}));

router.post('/issues', asyncHandler(async (req, res) => {
  const body = req.body || {};
  const order = await prisma.businessOrder.findUnique({
    where: { orderId: body.orderId },
    include: { customer: true, tool: true, plan: true, accountType: true }
  });
  if (!order) return res.status(404).json({ error: 'Order not found' });
  const agent = resolveIssueWithAgent({ order, message: body.description || body.message || '' });
  const issue = await prisma.issue.create({
    data: {
      orderId: order.orderId,
      description: body.description || body.message || '',
      status: agent.escalationRequired ? 'triaged' : 'closed',
      aiNotes: JSON.stringify(agent)
    }
  });
  const alertText = buildAdminEscalation({ customer: order.customer, order, message: body.description || body.message || '', issueType: agent.issueType });
  await prisma.adminAlert.create({
    data: { type: 'issue', title: `Issue ${order.orderId}`, message: alertText, severity: agent.escalationRequired ? 'warning' : 'info', payload: { issueId: issue.id } }
  }).catch(() => null);
  res.status(201).json({ issue, agent });
}));

router.put('/issues/:id/resolve', asyncHandler(async (req, res) => {
  const issue = await prisma.issue.update({
    where: { id: req.params.id },
    data: { status: 'resolved', resolution: req.body?.resolution || 'Resolved by admin', resolvedAt: new Date() }
  });
  await prisma.businessOrder.update({ where: { orderId: issue.orderId }, data: { warrantyIssuesResolved: { increment: 1 } } }).catch(() => null);
  res.json(issue);
}));

router.get('/agent/classify', (req, res) => {
  const message = String(req.query.message || '');
  res.json({ intent: classifyQuery(message), answer: answerFromKnowledge(message, String(req.query.tool || '')) });
});

router.get('/warranty/:orderId', asyncHandler(async (req, res) => {
  const order = await prisma.businessOrder.findUnique({ where: { orderId: req.params.orderId }, include: { accountType: true } });
  res.json(checkEligibility(order));
}));

router.get('/giveaways', (req, res) => {
  res.json(GIVEAWAYS.map(({ imagePath, ...giveaway }) => giveaway));
});

module.exports = router;
