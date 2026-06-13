const express = require('express');
const prisma = require('../services/prisma');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const rows = await prisma.alert.findMany({
    where: req.query.unread === 'true' ? { read: false } : {},
    orderBy: { createdAt: 'desc' },
    take: Number(req.query.limit || 100)
  });
  res.json(rows);
}));

router.put('/:id/read', asyncHandler(async (req, res) => {
  const row = await prisma.alert.update({ where: { id: req.params.id }, data: { read: true } });
  res.json(row);
}));

module.exports = router;
