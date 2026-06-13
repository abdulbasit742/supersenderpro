const express = require('express');
const prisma = require('../services/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { processDealerMessage, castTrustVote, addTrustedDealer } = require('../services/dealerIntelligence');
const priceAnalytics = require('../services/priceAnalytics');
const { triggerWorkflow } = require('../services/n8nClient');
const dealerAccess = require('../dealerIntelligence/dealerAccess');

const router = express.Router();

router.get('/rates', asyncHandler(async (req, res) => {
  const rows = await prisma.dealerRateIntelligence.findMany({
    where: {
      ...(req.query.tool ? { toolSlug: String(req.query.tool) } : {}),
      ...(req.query.plan ? { planSlug: String(req.query.plan) } : {}),
      ...(req.query.status ? { trustStatus: String(req.query.status) } : {})
    },
    orderBy: [{ parsedAt: 'desc' }, { price: 'asc' }],
    take: Number(req.query.limit || 300)
  });
  res.json(rows);
}));

router.post('/parse-message', asyncHandler(async (req, res) => {
  const result = await processDealerMessage({
    dealerNumber: req.body?.dealerNumber,
    dealerName: req.body?.dealerName || '',
    groupId: req.body?.groupId || '',
    groupName: req.body?.groupName || '',
    messageText: req.body?.message || req.body?.messageText || ''
  });
  req.app.get('io')?.emit('dealer:rates', result);
  triggerWorkflow('dealer_rate_collected', result).catch(() => {});
  res.json(result);
}));

router.get('/trusted', asyncHandler(async (req, res) => {
  res.json(await prisma.trustedDealer.findMany({ orderBy: [{ trustScore: 'desc' }, { dealerCode: 'asc' }] }));
}));

router.post('/trusted', asyncHandler(async (req, res) => {
  res.status(201).json(await addTrustedDealer(req.body || {}));
}));

router.get('/pending', asyncHandler(async (req, res) => {
  res.json(await prisma.trustPending.findMany({ where: { status: 'pending' }, orderBy: { firstSeen: 'desc' } }));
}));

router.post('/vote', asyncHandler(async (req, res) => {
  const body = req.body || {};
  res.json(await castTrustVote({
    dealerNumber: body.dealerNumber || body.number,
    voterNumber: body.voterNumber || body.voter || 'dashboard',
    vote: body.vote
  }));
}));

router.get('/scammers', asyncHandler(async (req, res) => {
  res.json(await prisma.scammer.findMany({ orderBy: { flaggedDate: 'desc' }, take: Number(req.query.limit || 200) }));
}));

router.post('/scammers', asyncHandler(async (req, res) => {
  const body = req.body || {};
  const row = await prisma.scammer.upsert({
    where: { number: String(body.number || '').replace(/\D/g, '') },
    update: { reason: body.reason || 'Flagged by admin', evidenceMessage: body.evidenceMessage || '' },
    create: { number: String(body.number || '').replace(/\D/g, ''), reason: body.reason || 'Flagged by admin', evidenceMessage: body.evidenceMessage || '' }
  });
  res.status(201).json(row);
}));

router.get('/dealer/:code', asyncHandler(async (req, res) => {
  const profile = await dealerAccess.getDealerProfile(req.params.code);
  if (!profile) return res.status(404).json({ error: 'Dealer not found' });
  res.json(profile);
}));

router.get('/dealer/:code/rates', asyncHandler(async (req, res) => {
  res.json(await dealerAccess.getDealerRates(req.params.code));
}));

router.get('/dealer/:code/stock', asyncHandler(async (req, res) => {
  res.json(await dealerAccess.getDealerStock(req.params.code));
}));

router.get('/best/:toolSlug', asyncHandler(async (req, res) => {
  res.json(await dealerAccess.getBestDealerForTool(req.params.toolSlug));
}));

router.get('/compare/:toolSlug', asyncHandler(async (req, res) => {
  res.json(await priceAnalytics.compareAllDealers(req.params.toolSlug));
}));

router.get('/price-summary', asyncHandler(async (req, res) => {
  res.json(await priceAnalytics.getDailyPriceSummary());
}));

router.get('/price-spread/:toolSlug/:planSlug?', asyncHandler(async (req, res) => {
  res.json(await priceAnalytics.getPriceSpread(req.params.toolSlug, req.params.planSlug));
}));

router.get('/price-trend/:toolSlug', asyncHandler(async (req, res) => {
  res.json(await priceAnalytics.getPriceTrend(req.params.toolSlug, req.query.days || 30));
}));

module.exports = router;
