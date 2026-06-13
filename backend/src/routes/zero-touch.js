const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { normalizePhone } = require('../utils/phone');
const {
  zeroTouchSummary,
  runZeroTouchJob,
  buildCustomerProfile,
  getDynamicAvailability,
  buildPricingRecommendations
} = require('../zeroTouch');

const router = express.Router();

router.get('/summary', asyncHandler(async (req, res) => {
  res.json(await zeroTouchSummary());
}));

router.get('/customer/:phone', asyncHandler(async (req, res) => {
  const profile = await buildCustomerProfile(normalizePhone(req.params.phone));
  if (!profile) return res.status(404).json({ error: 'Customer not found' });
  res.json(profile);
}));

router.get('/dynamic-availability', asyncHandler(async (req, res) => {
  res.json(await getDynamicAvailability(req.query.phone || ''));
}));

router.get('/pricing-recommendations', asyncHandler(async (req, res) => {
  res.json(await buildPricingRecommendations());
}));

router.post('/run/:job', asyncHandler(async (req, res) => {
  const result = await runZeroTouchJob(req.params.job, req.body || {}, req.app.get('io'));
  res.json({ success: true, job: req.params.job, result });
}));

module.exports = router;
