const express = require('express');
const prisma = require('../services/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { ensureToolAndPlan } = require('../services/rateService');
const { adjustStock } = require('../services/stockService');
const { syncPurchases } = require('../utils/sheetsSync');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const { dealerId, tool, from, to } = req.query;
  const purchases = await prisma.purchase.findMany({
    where: {
      ...(dealerId ? { dealerId: String(dealerId) } : {}),
      ...(from || to ? { purchaseDate: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {}),
      ...(tool ? { tool: { name: { contains: String(tool) } } } : {})
    },
    include: { dealer: true, tool: true, toolPlan: true },
    orderBy: [{ dealer: { priority: 'desc' } }, { purchaseDate: 'desc' }]
  });
  res.json(purchases);
}));

router.post('/', asyncHandler(async (req, res) => {
  const body = req.body || {};
  const { tool, plan } = await ensureToolAndPlan(body.toolName, body.plan || body.planName || 'Default');
  const quantity = Number(body.quantity || 1);
  const buyPriceEach = Number(body.buyPriceEach || body.buy_price_each || body.buyPrice || 0);
  const purchase = await prisma.purchase.create({
    data: {
      dealerId: body.dealerId,
      toolId: tool.id,
      planId: plan.id,
      plan: plan.name,
      quantity,
      buyPriceEach,
      totalCost: quantity * buyPriceEach,
      purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : new Date(),
      notes: body.notes || null
    },
    include: { dealer: true, tool: true, toolPlan: true }
  });
  await prisma.dealer.update({
    where: { id: body.dealerId },
    data: {
      totalOrders: { increment: 1 },
      totalAmount: { increment: purchase.totalCost },
      lastOrderDate: purchase.purchaseDate
    }
  });
  await adjustStock({ toolId: tool.id, planId: plan.id, plan: plan.name, quantityDelta: quantity, costEach: buyPriceEach, sourceDealerId: body.dealerId });
  syncPurchases().catch(() => {});
  req.app.get('io')?.emit('purchase:new', purchase);
  res.status(201).json(purchase);
}));

router.get('/export.xlsx', asyncHandler(async (req, res) => {
  const { rowsToWorkbook } = require('../services/exportService');
  const rows = await prisma.purchase.findMany({ include: { dealer: true, tool: true }, orderBy: { purchaseDate: 'desc' } });
  const buffer = rowsToWorkbook({
    Purchases: rows.map(p => ({
      date: p.purchaseDate.toISOString(),
      dealer: p.dealer.name,
      tool: p.tool.name,
      plan: p.plan,
      quantity: p.quantity,
      buyPriceEach: p.buyPriceEach,
      totalCost: p.totalCost,
      notes: p.notes || ''
    }))
  });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="purchases.xlsx"');
  res.send(buffer);
}));

module.exports = router;
