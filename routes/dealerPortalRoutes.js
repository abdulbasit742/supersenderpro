'use strict';
const express = require('express');
const router = express.Router();
const service = require('../lib/dealerPortal/dealerPortalService');
const summary = require('../lib/dealerPortal/statusSummaryPreview');
router.get('/status', (req, res) => res.json(service.getDealerStatus(req.query.dealerId || 'dlr_demo1')));
router.get('/summary-preview', (req, res) => res.json(summary.buildSummary(req.query.dealerId || 'dlr_demo1')));
router.get('/availability', (_req, res) => res.json(service.moduleAvailability()));
module.exports = router;
