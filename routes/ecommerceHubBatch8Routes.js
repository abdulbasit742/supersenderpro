'use strict';

/**
 * Ecommerce Hub — batch-8 routes.
 */
const express = require('express');
const router = express.Router();
const aiReply = require('../lib/ecommerceHub/aiReply');
const addressBook = require('../lib/ecommerceHub/addressBook');
const reorderPoint = require('../lib/ecommerceHub/reorderPoint');
const invoiceNumber = require('../lib/ecommerceHub/invoiceNumber');
const agentRouting = require('../lib/ecommerceHub/agentRouting');
const returnsAnalytics = require('../lib/ecommerceHub/returnsAnalytics');
const cartResume = require('../lib/ecommerceHub/cartResume');
const deliveryProof = require('../lib/ecommerceHub/deliveryProof');
const refundTracker = require('../lib/ecommerceHub/refundTracker');
const priorityQueue = require('../lib/ecommerceHub/priorityQueue');
const bundlePricing = require('../lib/ecommerceHub/bundlePricing');
const escalation = require('../lib/ecommerceHub/escalation');
const sentiment = require('../lib/ecommerceHub/sentiment');
const checkoutLink = require('../lib/ecommerceHub/checkoutLink');
const repeatBuyer = require('../lib/ecommerceHub/repeatBuyer');
const kpiAlert = require('../lib/ecommerceHub/kpiAlert');

const ENABLED = String(process.env.ECOMMERCE_HUB_ENABLED || 'true').toLowerCase() !== 'false';
function guard(req, res, next) { if (!ENABLED) return res.status(403).json({ ok: false, error: 'Ecommerce Hub disabled.' }); next(); }
function fail(res) { return function (e) { res.status(500).json({ ok: false, error: e && e.message }); }; }

router.post('/ai-reply', guard, function (req, res) { aiReply.reply((req.body || {}).text, (req.body || {}).context).then(function (r) { res.json({ ok: true, reply: r, aiAvailable: aiReply.enabled() }); }).catch(fail(res)); });
router.post('/address/add', guard, function (req, res) { const b = req.body || {}; res.json(addressBook.add(b.phone, b.address, b.label)); });
router.get('/address', guard, function (req, res) { res.json({ ok: true, addresses: addressBook.list(req.query.phone) }); });
router.get('/reorder-point', guard, function (req, res) { reorderPoint.build().then(function (r) { res.json(r); }).catch(fail(res)); });
router.get('/invoice-number/next', guard, function (req, res) { res.json({ ok: true, invoiceNo: invoiceNumber.next() }); });
router.post('/agent/assign', guard, function (req, res) { res.json({ ok: true, agent: agentRouting.assign((req.body || {}).buyerPhone) }); });
router.get('/returns/analytics', guard, function (req, res) { res.json(returnsAnalytics.build()); });
router.post('/mycart/add', guard, function (req, res) { const b = req.body || {}; res.json({ ok: true, reply: cartResume.addItem(b.phone, b.productId) }); });
router.get('/mycart', guard, function (req, res) { res.json({ ok: true, reply: cartResume.reply(req.query.phone) }); });
router.post('/pod/record', guard, function (req, res) { const b = req.body || {}; res.json(deliveryProof.record(b.orderId, b)); });
router.get('/pod', guard, function (req, res) { res.json({ ok: true, pod: deliveryProof.get(req.query.orderId) }); });
router.post('/refund/open', guard, function (req, res) { refundTracker.open(req.body || {}).then(function (r) { res.json(r); }).catch(fail(res)); });
router.post('/refund/update', guard, function (req, res) { const b = req.body || {}; refundTracker.update(b.orderId, b.status).then(function (r) { res.json(r); }).catch(fail(res)); });
router.post('/priority/rank', guard, function (req, res) { res.json({ ok: true, ranked: priorityQueue.rank((req.body || {}).orders || []) }); });
router.post('/bundle-pricing/create', guard, function (req, res) { res.json(bundlePricing.create(req.body || {})); });
router.get('/bundle-pricing/quote', guard, function (req, res) { res.json(bundlePricing.quote(req.query.id)); });
router.post('/checkout-link', guard, function (req, res) { res.json(checkoutLink.build(req.body || {})); });
router.get('/sentiment', guard, function (req, res) { res.json({ ok: true, sentiment: sentiment.classify(req.query.text) }); });
router.get('/repeat-buyers', guard, function (req, res) { repeatBuyer.build().then(function (r) { res.json(r); }).catch(fail(res)); });
router.post('/kpi/send', guard, function (req, res) { kpiAlert.send().then(function (r) { res.json(r); }).catch(fail(res)); });

module.exports = router;
