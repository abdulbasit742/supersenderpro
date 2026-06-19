// routes/ads.js – API endpoints for Ads Manager

const express = require('express');
const router = express.Router();

const adsManager = require('../lib/adsManager');

// Middleware to validate platform parameter
function validatePlatform(req, res, next) {
  const platform = req.params.platform;
  if (!['google', 'facebook', 'instagram'].includes(platform)) {
    return res.status(400).json({ success: false, error: 'Unsupported platform' });
  }
  req.platform = platform;
  next();
}

// Create a new campaign
router.post('/:storeId/:platform/campaign', validatePlatform, async (req, res) => {
  const { storeId } = req.params;
  const campaignData = req.body;
  try {
    const result = await adsManager.createCampaign({ storeId, platform: req.platform, campaignData });
    res.json({ success: true, campaign: result });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// Update an existing campaign (budget/status/etc.)
router.patch('/:storeId/:platform/campaign/:campaignId', validatePlatform, async (req, res) => {
  const { storeId, campaignId } = req.params;
  const updateData = req.body;
  try {
    const result = await adsManager.updateCampaign({ storeId, platform: req.platform, campaignId, updateData });
    res.json({ success: true, result });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// Get performance report for a store/platform
router.get('/:storeId/:platform/report', validatePlatform, async (req, res) => {
  const { storeId } = req.params;
  const params = req.query; // e.g., date range
  try {
    const report = await adsManager.fetchReport({ storeId, platform: req.platform, params });
    res.json({ success: true, report });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
