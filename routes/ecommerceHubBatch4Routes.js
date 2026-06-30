'use strict';

/**
 * Ecommerce Hub — batch-4 routes.
 * POST /api/ecommerce-hub/invoice            { order } -> text+html
 * POST /api/ecommerce-hub/nps/ask            { buyerPhone, orderId }
 * GET  /api/ecommerce-hub/nps/summary
 * GET  /api/ecommerce-hub/referral?phone=...
 * POST /api/ecommerce-hub/referral/apply     { refereePhone, code, orderValue }
 * POST /api/ecommerce-hub/backinstock/subscribe { phone, productId }
 * POST /api/ecommerce-hub/backinstock/sweep
 * POST /api/ecommerce-hub/drip/enroll        { phone, sequence }
 * POST /api/ecommerce-hub/drip/tick
 * POST /api/ecommerce-hub/cod-otp/issue      { buyerPhone, orderId }
 * POST /api/ecommerce-hub/stores/upsert      { id, name, city, adminNumbers[] }
 * GET  /api/ecommerce-hub/stores
 * POST /api/ecommerce-hub/jobs/run-daily
 * Read-only to platforms; persistent local state. Dry-run safe.
 */

const express = require('express');
const router = express.Router();
const invoice = require('../lib/ecommerceHub/invoice');
const nps = require('../lib/ecommerceHub/nps');
const referral = require('../lib/ecommerceHub/referral');
const backInStock = require('../lib/ecommerceHub/backInStock');
const drip = require('../lib/ecommerceHub/dripCampaign');
const codOtp = require('../lib/ecommerceHub/codOtp');
const stores = require('../lib/ecommerceHub/stores');
const jobsRunner = require('../lib/ecommerceHub/jobsRunner');

const ENABLED = String(process.env.ECOMMERCE_HUB_ENABLED || 'true').toLowerCase() !== 'false';
function guard(req, res, next) { if (!ENABLED) return res.status(403).json({ ok: false, error: 'Ecommerce Hub disabled.' }); next(); }
function fail(res) { return function (e) { res.status(500).json({ ok: false, error: e && e.message }); }; }

router.post('/invoice', guard, function (req, res) { const o = (req.body && req.body.order) || req.body || {}; res.json({ ok: true, text: invoice.textInvoice(o), html: invoice.htmlInvoice(o) }); });

router.post('/nps/ask', guard, function (req, res) { nps.ask(req.body || {}).then(function (r) { res.json(r); }).catch(fail(res)); });
router.get('/nps/summary', guard, function (req, res) { res.json(nps.summary()); });

router.get('/referral', guard, function (req, res) { res.json({ ok: true, reply: referral.reply(req.query.phone) }); });
router.post('/referral/apply', guard, function (req, res) { const b = req.body || {}; res.json(referral.apply(b.refereePhone, b.code, b.orderValue)); });

router.post('/backinstock/subscribe', guard, function (req, res) { const b = req.body || {}; res.json({ ok: true, message: backInStock.subscribe(b.phone, b.productId) }); });
router.post('/backinstock/sweep', guard, function (req, res) { backInStock.sweep().then(function (r) { res.json(r); }).catch(fail(res)); });

router.post('/drip/enroll', guard, function (req, res) { const b = req.body || {}; res.json(drip.enroll(b.phone, b.sequence)); });
router.post('/drip/tick', guard, function (req, res) { drip.tick().then(function (r) { res.json(r); }).catch(fail(res)); });

router.post('/cod-otp/issue', guard, function (req, res) { codOtp.issue(req.body || {}).then(function (r) { res.json(r); }).catch(fail(res)); });

router.post('/stores/upsert', guard, function (req, res) { res.json(stores.upsert(req.body || {})); });
router.get('/stores', guard, function (req, res) { res.json({ ok: true, stores: stores.list() }); });

router.post('/jobs/run-daily', guard, function (req, res) { jobsRunner.runDaily().then(function (r) { res.json(r); }).catch(fail(res)); });

module.exports = router;
