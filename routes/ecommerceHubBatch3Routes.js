'use strict';

/**
 * Ecommerce Hub — batch-3 routes.
 * POST /api/ecommerce-hub/agent/request   { phone, text }
 * POST /api/ecommerce-hub/agent/resolve   { phone }
 * GET  /api/ecommerce-hub/agent/queue
 * GET  /api/ecommerce-hub/order/search?q=...
 * POST /api/ecommerce-hub/wishlist/add     { phone, productId }
 * GET  /api/ecommerce-hub/wishlist?phone=...
 * POST /api/ecommerce-hub/pricewatch/sweep
 * GET  /api/ecommerce-hub/bundle?id=...
 * POST /api/ecommerce-hub/risk/score       { order fields }
 * Read-only to platforms; persistent local state. Dry-run safe.
 */

const express = require('express');
const router = express.Router();
const liveAgent = require('../lib/ecommerceHub/liveAgent');
const orderSearch = require('../lib/ecommerceHub/orderSearch');
const wishlist = require('../lib/ecommerceHub/wishlist');
const priceWatch = require('../lib/ecommerceHub/priceWatch');
const bundles = require('../lib/ecommerceHub/bundles');
const riskScore = require('../lib/ecommerceHub/riskScore');

const ENABLED = String(process.env.ECOMMERCE_HUB_ENABLED || 'true').toLowerCase() !== 'false';
function guard(req, res, next) { if (!ENABLED) return res.status(403).json({ ok: false, error: 'Ecommerce Hub disabled.' }); next(); }

router.post('/agent/request', guard, function (req, res) { const b = req.body || {}; liveAgent.request(b.phone, b.text).then(function (m) { res.json({ ok: true, message: m }); }).catch(function (e) { res.status(500).json({ ok: false, error: e && e.message }); }); });
router.post('/agent/resolve', guard, function (req, res) { res.json({ ok: liveAgent.resolve((req.body || {}).phone) }); });
router.get('/agent/queue', guard, function (req, res) { res.json({ ok: true, queue: liveAgent.listWaiting() }); });

router.get('/order/search', guard, function (req, res) { res.json(orderSearch.lookup(req.query.q)); });

router.post('/wishlist/add', guard, function (req, res) { const b = req.body || {}; res.json({ ok: true, message: wishlist.add(b.phone, b.productId) }); });
router.get('/wishlist', guard, function (req, res) { res.json({ ok: true, reply: wishlist.listReply(req.query.phone) }); });

router.post('/pricewatch/sweep', guard, function (req, res) { priceWatch.sweep().then(function (r) { res.json(r); }).catch(function (e) { res.status(500).json({ ok: false, error: e && e.message }); }); });

router.get('/bundle', guard, function (req, res) { res.json({ ok: true, reply: bundles.reply(req.query.id) }); });

router.post('/risk/score', guard, function (req, res) { res.json(riskScore.score(req.body || {})); });

module.exports = router;
