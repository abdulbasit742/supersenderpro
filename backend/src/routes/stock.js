const express = require('express');
const prisma = require('../services/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { stockOverview } = require('../services/stockService');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  res.json(await stockOverview());
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const body = req.body || {};
  const row = await prisma.stockItem.update({
    where: { id: req.params.id },
    data: {
      ...(body.availableQty !== undefined ? { availableQty: Number(body.availableQty) } : {}),
      ...(body.reservedQty !== undefined ? { reservedQty: Number(body.reservedQty) } : {}),
      ...(body.lowThreshold !== undefined ? { lowThreshold: Number(body.lowThreshold) } : {}),
      ...(body.avgCost !== undefined ? { avgCost: Number(body.avgCost), stockValue: Number(body.avgCost) * Number(body.availableQty || 0) } : {})
    },
    include: { tool: true, planRef: true }
  });
  res.json(row);
}));

router.get('/reorder-suggestions', asyncHandler(async (req, res) => {
  const days = Number(req.query.days || 30);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const [stock, sales] = await Promise.all([
    prisma.stockItem.findMany({ include: { tool: true, planRef: true } }),
    prisma.sale.findMany({ where: { saleDate: { gte: since } } })
  ]);
  const soldMap = new Map();
  for (const sale of sales) {
    const key = `${sale.toolId}:${sale.plan}`;
    soldMap.set(key, (soldMap.get(key) || 0) + sale.quantity);
  }
  const suggestions = stock.map(row => {
    const sold = soldMap.get(`${row.toolId}:${row.plan}`) || 0;
    const velocity = sold / Math.max(days, 1);
    const target = Math.ceil(velocity * 10);
    return {
      stockId: row.id,
      tool: row.tool.name,
      plan: row.plan,
      availableQty: row.availableQty,
      soldLastDays: sold,
      dailyVelocity: velocity,
      reorderQty: Math.max(0, target - row.availableQty),
      priority: row.availableQty <= row.lowThreshold || row.availableQty < target
    };
  }).filter(x => x.priority).sort((a, b) => b.reorderQty - a.reorderQty);
  res.json(suggestions);
}));

module.exports = router;
