'use strict';

/**
 * Ecommerce Hub — pipeline orchestrator routes.
 * POST /api/ecommerce-hub/pipeline/order    { ...order }   -> run full ingest chain
 * POST /api/ecommerce-hub/pipeline/ship      { platform, orderId, buyerPhone, courier, trackingId }
 * POST /api/ecommerce-hub/pipeline/deliver   { platform, orderId, buyerPhone, productId?, everyDays?, pod? }
 * GET  /api/ecommerce-hub/pipeline/funnel    -> funnel snapshot
 * One entry point that drives the whole lifecycle across all modules. Dry-run safe.
 */

const express = require('express');
const router = express.Router();
const pipeline = require('../lib/ecommerceHub/orderPipeline');
const stats = require('../lib/ecommerceHub/pipelineStats');

const ENABLED = String(process.env.ECOMMERCE_HUB_ENABLED || 'true').toLowerCase() !== 'false';
function guard(req, res, next) { if (!ENABLED) return res.status(403).json({ ok: false, error: 'Ecommerce Hub disabled.' }); next(); }
function fail(res) { return function (e) { res.status(500).json({ ok: false, error: e && e.message }); }; }

router.post('/pipeline/order', guard, function (req, res) { pipeline.ingest(req.body || {}).then(function (r) { res.json(r); }).catch(fail(res)); });
router.post('/pipeline/ship', guard, function (req, res) { pipeline.ship(req.body || {}).then(function (r) { res.json(r); }).catch(fail(res)); });
router.post('/pipeline/deliver', guard, function (req, res) { pipeline.deliver(req.body || {}).then(function (r) { res.json(r); }).catch(fail(res)); });
router.get('/pipeline/funnel', guard, function (req, res) { res.json(stats.build()); });

module.exports = router;
