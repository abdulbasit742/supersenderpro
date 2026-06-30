'use strict';

/**
 * Ecommerce Hub — growth + lifecycle intake/test routes.
 * All read/notify only; dry-run safe unless ORDER_NOTIFY_ENABLED=true.
 *
 * POST /api/ecommerce-hub/cart-event      track an abandoned cart
 * POST /api/ecommerce-hub/cart/sweep      send recovery nudges now
 * POST /api/ecommerce-hub/status-event    push an order status update to buyer
 * POST /api/ecommerce-hub/review/request  ask a buyer to rate
 * POST /api/ecommerce-hub/alerts/low-stock
 * POST /api/ecommerce-hub/alerts/digest
 * POST /api/ecommerce-hub/coupons/issue   { code?, type, value, expiresAt?, maxUses? }
 * GET  /api/ecommerce-hub/coupons/list
 * POST /api/ecommerce-hub/broadcast       { message, platform? }
 * POST /api/ecommerce-hub/reorder/remind
 */

const express = require('express');
const router = express.Router();
const cart = require('../lib/ecommerceHub/abandonedCart');
const status = require('../lib/ecommerceHub/orderStatus');
const reviews = require('../lib/ecommerceHub/reviews');
const alerts = require('../lib/ecommerceHub/alerts');
const coupons = require('../lib/ecommerceHub/coupons');
const broadcast = require('../lib/ecommerceHub/broadcast');
const reorder = require('../lib/ecommerceHub/reorder');

const ENABLED = String(process.env.ECOMMERCE_HUB_ENABLED || 'true').toLowerCase() !== 'false';
function guard(req, res, next) { if (!ENABLED) return res.status(403).json({ ok: false, error: 'Ecommerce Hub disabled.' }); next(); }
function done(res) { return function (r) { res.json(r && r.ok === false ? Object.assign({ httpOk: true }, r) : { ok: true, result: r }); }; }
function fail(res) { return function (e) { res.status(500).json({ ok: false, error: e && e.message }); }; }

router.post('/cart-event', guard, function (req, res) { Promise.resolve(cart.trackCart(req.body)).then(done(res)).catch(fail(res)); });
router.post('/cart/sweep', guard, function (req, res) { cart.sweep().then(done(res)).catch(fail(res)); });
router.post('/status-event', guard, function (req, res) { status.update(req.body).then(done(res)).catch(fail(res)); });
router.post('/review/request', guard, function (req, res) { reviews.requestReview(req.body).then(done(res)).catch(fail(res)); });
router.get('/review/list', guard, function (req, res) { res.json({ ok: true, reviews: reviews.list() }); });
router.post('/alerts/low-stock', guard, function (req, res) { alerts.lowStockScan().then(done(res)).catch(fail(res)); });
router.post('/alerts/digest', guard, function (req, res) { alerts.dailyDigest().then(done(res)).catch(fail(res)); });
router.post('/coupons/issue', guard, function (req, res) { res.json({ ok: true, coupon: coupons.issue(req.body) }); });
router.get('/coupons/list', guard, function (req, res) { res.json({ ok: true, coupons: coupons.list() }); });
router.post('/broadcast', guard, function (req, res) { broadcast.send((req.body || {}).message, req.body || {}).then(done(res)).catch(fail(res)); });
router.post('/reorder/remind', guard, function (req, res) { reorder.remind().then(done(res)).catch(fail(res)); });

module.exports = router;
