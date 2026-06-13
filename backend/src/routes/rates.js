const express = require('express');
const prisma = require('../services/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { createRateEntry, cheapestRates, rateHistory } = require('../services/rateService');
const { profitSuggestions, marginPct, minSellPrice } = require('../services/profitEngine');
const { extractRatesFromMessage } = require('../utils/rateParser');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const { tool, plan, dealerId, days = 30 } = req.query;
  const since = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);
  const rates = await prisma.rateEntry.findMany({
    where: {
      ...(tool ? { toolName: { contains: String(tool) } } : {}),
      ...(plan ? { planName: { contains: String(plan) } } : {}),
      ...(dealerId ? { dealerId: String(dealerId) } : {}),
      rateDate: { gte: since }
    },
    include: { dealer: true, tool: true, plan: true },
    orderBy: [{ rateDate: 'desc' }, { buyPrice: 'asc' }]
  });
  res.json(rates);
}));

router.post('/', asyncHandler(async (req, res) => {
  const rate = await createRateEntry(req.body || {});
  req.app.get('io')?.emit('rate:new', rate);
  res.status(201).json(rate);
}));

router.post('/parse', asyncHandler(async (req, res) => {
  const rows = extractRatesFromMessage(req.body?.message || '');
  res.json({ count: rows.length, rows });
}));

router.post('/parse-save', asyncHandler(async (req, res) => {
  const { message = '', dealerId, groupId } = req.body || {};
  const parsed = extractRatesFromMessage(message);
  const saved = [];
  for (const row of parsed) {
    saved.push(await createRateEntry({ ...row, dealerId, groupId, rawText: message, source: 'WHATSAPP_GROUP' }));
  }
  req.app.get('io')?.emit('rates:bulk', saved);
  res.json({ count: saved.length, saved });
}));

router.get('/cheapest', asyncHandler(async (req, res) => {
  res.json(await cheapestRates());
}));

router.get('/profit-suggestions', asyncHandler(async (req, res) => {
  res.json(await profitSuggestions({
    sellPrice: req.query.sellPrice,
    quantity: req.query.quantity || 1,
    desiredMarginPct: req.query.margin || 20
  }));
}));

router.get('/calculator', asyncHandler(async (req, res) => {
  const buyPrice = Number(req.query.buyPrice || 0);
  const sellPrice = Number(req.query.sellPrice || 0);
  const desiredMarginPct = Number(req.query.margin || 20);
  res.json({
    buyPrice,
    sellPrice,
    profit: sellPrice - buyPrice,
    marginPct: marginPct(sellPrice, buyPrice),
    minSellPrice: minSellPrice(buyPrice, desiredMarginPct)
  });
}));

router.get('/history/:toolId', asyncHandler(async (req, res) => {
  res.json(await rateHistory(req.params.toolId, req.query.planId, req.query.days || 30));
}));

module.exports = router;
