const express = require('express');
const prisma = require('../services/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { normalizePhone } = require('../utils/phone');
const { ensureToolAndPlan } = require('../services/rateService');
const { adjustStock } = require('../services/stockService');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const { customer, tool, paymentStatus, deliveryStatus, from, to } = req.query;
  const sales = await prisma.sale.findMany({
    where: {
      ...(customer ? { OR: [{ customerName: { contains: String(customer) } }, { customerWhatsapp: { contains: String(customer) } }] } : {}),
      ...(tool ? { tool: { name: { contains: String(tool) } } } : {}),
      ...(paymentStatus ? { paymentStatus: String(paymentStatus).toUpperCase() } : {}),
      ...(deliveryStatus ? { deliveryStatus: String(deliveryStatus).toUpperCase() } : {}),
      ...(from || to ? { saleDate: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {})
    },
    include: { customer: true, tool: true, toolPlan: true },
    orderBy: { saleDate: 'desc' }
  });
  res.json(sales);
}));

router.post('/', asyncHandler(async (req, res) => {
  const body = req.body || {};
  const phone = normalizePhone(body.customerWhatsapp || body.customer_whatsapp || body.whatsapp);
  const { tool, plan } = await ensureToolAndPlan(body.toolName, body.plan || body.planName || 'Default');
  const quantity = Number(body.quantity || 1);
  const sellPriceEach = Number(body.sellPriceEach || body.sell_price_each || body.sellPrice || 0);
  const stock = await prisma.stockItem.findUnique({ where: { toolId_plan: { toolId: tool.id, plan: plan.name } } });
  const costEach = Number(body.costEach || stock?.avgCost || 0);
  const customer = await prisma.customer.upsert({
    where: { whatsapp: phone },
    update: {
      name: body.customerName || body.customer_name || body.name || 'Customer',
      totalOrders: { increment: 1 },
      totalSpent: { increment: quantity * sellPriceEach },
      lastOrder: new Date()
    },
    create: {
      name: body.customerName || body.customer_name || body.name || 'Customer',
      whatsapp: phone,
      totalOrders: 1,
      totalSpent: quantity * sellPriceEach,
      firstOrder: new Date(),
      lastOrder: new Date(),
      tags: body.customerTags || []
    }
  });
  const sale = await prisma.sale.create({
    data: {
      customerId: customer.id,
      customerName: customer.name,
      customerWhatsapp: phone,
      toolId: tool.id,
      planId: plan.id,
      plan: plan.name,
      quantity,
      sellPriceEach,
      totalRevenue: quantity * sellPriceEach,
      costEach,
      profit: quantity * (sellPriceEach - costEach),
      paymentStatus: (body.paymentStatus || 'PENDING').toUpperCase(),
      deliveryStatus: (body.deliveryStatus || 'PENDING').toUpperCase(),
      buyReasonTags: body.buyReasonTags || [],
      lostReason: body.lostReason || null,
      notes: body.notes || null
    },
    include: { customer: true, tool: true, toolPlan: true }
  });
  await adjustStock({ toolId: tool.id, planId: plan.id, plan: plan.name, quantityDelta: -quantity, costEach });
  req.app.get('io')?.emit('sale:new', sale);
  res.status(201).json(sale);
}));

router.get('/export.xlsx', asyncHandler(async (req, res) => {
  const { rowsToWorkbook } = require('../services/exportService');
  const rows = await prisma.sale.findMany({ include: { tool: true }, orderBy: { saleDate: 'desc' } });
  const buffer = rowsToWorkbook({
    Sales: rows.map(s => ({
      date: s.saleDate.toISOString(),
      customer: s.customerName,
      whatsapp: s.customerWhatsapp,
      tool: s.tool.name,
      plan: s.plan,
      quantity: s.quantity,
      sellPriceEach: s.sellPriceEach,
      revenue: s.totalRevenue,
      profit: s.profit,
      paymentStatus: s.paymentStatus,
      deliveryStatus: s.deliveryStatus
    }))
  });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="sales.xlsx"');
  res.send(buffer);
}));

module.exports = router;
