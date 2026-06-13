const express = require('express');
const prisma = require('../services/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { slugify } = require('../services/rateService');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const tools = await prisma.tool.findMany({
    include: { plans: { orderBy: { name: 'asc' } }, stockItems: true },
    orderBy: { name: 'asc' }
  });
  res.json(tools);
}));

router.post('/', asyncHandler(async (req, res) => {
  const body = req.body || {};
  const tool = await prisma.tool.create({
    data: {
      name: body.name,
      slug: body.slug || slugify(body.name),
      category: body.category || 'AI Tool',
      active: body.active !== false,
      plans: body.plans ? {
        create: body.plans.map(p => ({
          name: p.name,
          slug: p.slug || slugify(p.name),
          defaultSellPrice: Number(p.defaultSellPrice || 0),
          desiredMarginPct: Number(p.desiredMarginPct || 20),
          lowStockThreshold: Number(p.lowStockThreshold || 2)
        }))
      } : undefined
    },
    include: { plans: true }
  });
  res.status(201).json(tool);
}));

router.put('/plans/:id', asyncHandler(async (req, res) => {
  const body = req.body || {};
  const plan = await prisma.toolPlan.update({
    where: { id: req.params.id },
    data: {
      ...(body.name !== undefined ? { name: body.name, slug: slugify(body.name) } : {}),
      ...(body.defaultSellPrice !== undefined ? { defaultSellPrice: Number(body.defaultSellPrice) } : {}),
      ...(body.desiredMarginPct !== undefined ? { desiredMarginPct: Number(body.desiredMarginPct) } : {}),
      ...(body.lowStockThreshold !== undefined ? { lowStockThreshold: Number(body.lowStockThreshold) } : {}),
      ...(body.active !== undefined ? { active: Boolean(body.active) } : {})
    }
  });
  res.json(plan);
}));

module.exports = router;
