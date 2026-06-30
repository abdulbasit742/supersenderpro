'use strict';

/**
 * Ecommerce Hub — batch-7 routes.
 */
const express = require('express');
const router = express.Router();
const catalogSearch = require('../lib/ecommerceHub/catalogSearch');
const recommendations = require('../lib/ecommerceHub/recommendations');
const waitlist = require('../lib/ecommerceHub/waitlist');
const orderNotes = require('../lib/ecommerceHub/orderNotesStore');
const deliveryEta = require('../lib/ecommerceHub/deliveryEta');
const paymentLinks = require('../lib/ecommerceHub/paymentLinks');
const storeHours = require('../lib/ecommerceHub/storeHours');
const blacklist = require('../lib/ecommerceHub/blacklist');
const stockSyncAlerts = require('../lib/ecommerceHub/stockSyncAlerts');
const topSellers = require('../lib/ecommerceHub/topSellers');
const birthdays = require('../lib/ecommerceHub/birthdays');
const browseAbandon = require('../lib/ecommerceHub/browseAbandon');
const qrDeepLink = require('../lib/ecommerceHub/qrDeepLink');

const ENABLED = String(process.env.ECOMMERCE_HUB_ENABLED || 'true').toLowerCase() !== 'false';
function guard(req, res, next) { if (!ENABLED) return res.status(403).json({ ok: false, error: 'Ecommerce Hub disabled.' }); next(); }
function fail(res) { return function (e) { res.status(500).json({ ok: false, error: e && e.message }); }; }

router.get('/find', guard, function (req, res) { res.json({ ok: true, reply: catalogSearch.reply(req.query.q) }); });
router.get('/recommend', guard, function (req, res) { res.json({ ok: true, reply: recommendations.reply() }); });
router.post('/waitlist/join', guard, function (req, res) { const b = req.body || {}; res.json(waitlist.join(b.productId, b.phone)); });
router.post('/waitlist/notify', guard, function (req, res) { const b = req.body || {}; waitlist.notifyAll(b.productId, b.title).then(function (r) { res.json(r); }).catch(fail(res)); });
router.post('/order-notes/add', guard, function (req, res) { const b = req.body || {}; res.json({ ok: orderNotes.add(b.orderId, b.note) }); });
router.get('/order-notes', guard, function (req, res) { res.json({ ok: true, notes: orderNotes.get(req.query.orderId) }); });
router.get('/eta', guard, function (req, res) { res.json(deliveryEta.estimate(req.query.city)); });
router.post('/payment-link', guard, function (req, res) { res.json(paymentLinks.build(req.body || {})); });
router.get('/store-hours', guard, function (req, res) { res.json({ ok: true, open: storeHours.isOpen(), away: storeHours.awayMessage() }); });
router.post('/blacklist/add', guard, function (req, res) { const b = req.body || {}; res.json({ ok: blacklist.add(b.phone, b.reason) }); });
router.post('/blacklist/remove', guard, function (req, res) { res.json({ ok: blacklist.remove((req.body || {}).phone) }); });
router.get('/blacklist', guard, function (req, res) { res.json({ ok: true, blocked: blacklist.list() }); });
router.post('/stock-sync/scan', guard, function (req, res) { stockSyncAlerts.scan().then(function (r) { res.json(r); }).catch(fail(res)); });
router.get('/bestsellers', guard, function (req, res) { res.json({ ok: true, reply: topSellers.reply() }); });
router.post('/birthday/set', guard, function (req, res) { const b = req.body || {}; res.json(birthdays.set(b.phone, b.monthDay)); });
router.post('/birthday/run', guard, function (req, res) { birthdays.runToday().then(function (r) { res.json(r); }).catch(fail(res)); });
router.post('/browse/track', guard, function (req, res) { const b = req.body || {}; res.json({ ok: browseAbandon.track(b.phone, b.productId) }); });
router.post('/browse/sweep', guard, function (req, res) { browseAbandon.sweep().then(function (r) { res.json(r); }).catch(fail(res)); });
router.get('/qr', guard, function (req, res) { res.json(qrDeepLink.qr(req.query.text || '')); });

module.exports = router;
