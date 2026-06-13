const express = require('express');
const prisma = require('../services/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { normalizePhone } = require('../utils/phone');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const { q = '', vip } = req.query;
  const customers = await prisma.customer.findMany({
    where: {
      ...(q ? { OR: [{ name: { contains: String(q) } }, { whatsapp: { contains: String(q) } }] } : {}),
      ...(vip === 'true' ? { isVip: true } : {})
    },
    include: { sales: { take: 5, orderBy: { saleDate: 'desc' } } },
    orderBy: [{ isVip: 'desc' }, { lastOrder: 'desc' }]
  });
  res.json(customers);
}));

router.post('/', asyncHandler(async (req, res) => {
  const body = req.body || {};
  const customer = await prisma.customer.upsert({
    where: { whatsapp: normalizePhone(body.whatsapp || body.phone) },
    update: {
      name: body.name || 'Customer',
      isVip: Boolean(body.isVip),
      notes: body.notes || null,
      tags: body.tags || []
    },
    create: {
      name: body.name || 'Customer',
      whatsapp: normalizePhone(body.whatsapp || body.phone),
      isVip: Boolean(body.isVip),
      notes: body.notes || null,
      tags: body.tags || []
    }
  });
  res.status(201).json(customer);
}));

module.exports = router;
