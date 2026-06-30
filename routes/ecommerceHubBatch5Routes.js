'use strict';

/**
 * Ecommerce Hub — batch-5 routes.
 * GET  /api/ecommerce-hub/currency/convert?amount=1000&to=USD
 * GET  /api/ecommerce-hub/tax?subtotal=1000
 * POST /api/ecommerce-hub/packing-slip          { order } -> html
 * POST /api/ecommerce-hub/returns/open          { orderId, buyerPhone, reason }
 * POST /api/ecommerce-hub/returns/status        { id, status }
 * GET  /api/ecommerce-hub/returns/list
 * POST /api/ecommerce-hub/gift/set              { orderId, wrap, message }
 * POST /api/ecommerce-hub/hold/reserve          { productId, qty, phone }
 * POST /api/ecommerce-hub/hold/release          { id }
 * POST /api/ecommerce-hub/crm/note              { phone, note }
 * POST /api/ecommerce-hub/crm/tag               { phone, tag }
 * GET  /api/ecommerce-hub/crm?phone=...
 * POST /api/ecommerce-hub/timeline/record       { platform, orderId, event }
 * GET  /api/ecommerce-hub/timeline?platform=&orderId=
 * POST /api/ecommerce-hub/flash/set             { headline, discountPct, start, end }
 * GET  /api/ecommerce-hub/flash/banner
 * POST /api/ecommerce-hub/webhooks/emit         { event, data }
 * Read-only to platforms; persistent local state. Dry-run safe.
 */

const express = require('express');
const router = express.Router();
const currency = require('../lib/ecommerceHub/currencyRates');
const tax = require('../lib/ecommerceHub/tax');
const packingSlip = require('../lib/ecommerceHub/packingSlip');
const returns = require('../lib/ecommerceHub/returns');
const gift = require('../lib/ecommerceHub/giftOptions');
const hold = require('../lib/ecommerceHub/stockHold');
const crm = require('../lib/ecommerceHub/crmNotes');
const timeline = require('../lib/ecommerceHub/orderTimeline');
const flash = require('../lib/ecommerceHub/flashSale');
const webhooks = require('../lib/ecommerceHub/outboundWebhooks');

const ENABLED = String(process.env.ECOMMERCE_HUB_ENABLED || 'true').toLowerCase() !== 'false';
function guard(req, res, next) { if (!ENABLED) return res.status(403).json({ ok: false, error: 'Ecommerce Hub disabled.' }); next(); }
function fail(res) { return function (e) { res.status(500).json({ ok: false, error: e && e.message }); }; }

router.get('/currency/convert', guard, function (req, res) { res.json({ ok: true, base: currency.base(), to: req.query.to, value: currency.convert(Number(req.query.amount), req.query.to), formatted: currency.format(Number(req.query.amount), req.query.to) }); });
router.get('/tax', guard, function (req, res) { res.json({ ok: true, tax: tax.compute(Number(req.query.subtotal)) }); });
router.post('/packing-slip', guard, function (req, res) { const o = (req.body && req.body.order) || req.body || {}; res.set('Content-Type', 'text/html'); res.send(packingSlip.html(o)); });

router.post('/returns/open', guard, function (req, res) { returns.open(req.body || {}).then(function (r) { res.json(r); }).catch(fail(res)); });
router.post('/returns/status', guard, function (req, res) { const b = req.body || {}; returns.updateStatus(b.id, b.status).then(function (r) { res.json(r); }).catch(fail(res)); });
router.get('/returns/list', guard, function (req, res) { res.json({ ok: true, rmas: returns.list() }); });

router.post('/gift/set', guard, function (req, res) { const b = req.body || {}; res.json(gift.set(b.orderId, b)); });

router.post('/hold/reserve', guard, function (req, res) { const b = req.body || {}; res.json(hold.reserve(b.productId, b.qty, b.phone)); });
router.post('/hold/release', guard, function (req, res) { res.json({ ok: hold.release((req.body || {}).id) }); });

router.post('/crm/note', guard, function (req, res) { const b = req.body || {}; res.json({ ok: crm.addNote(b.phone, b.note) }); });
router.post('/crm/tag', guard, function (req, res) { const b = req.body || {}; res.json({ ok: crm.addTag(b.phone, b.tag) }); });
router.get('/crm', guard, function (req, res) { res.json({ ok: true, person: crm.get(req.query.phone) }); });

router.post('/timeline/record', guard, function (req, res) { const b = req.body || {}; res.json({ ok: timeline.record(b.platform, b.orderId, b.event, b.meta) }); });
router.get('/timeline', guard, function (req, res) { res.json({ ok: true, timeline: timeline.get(req.query.platform, req.query.orderId) }); });

router.post('/flash/set', guard, function (req, res) { res.json(flash.set(req.body || {})); });
router.get('/flash/banner', guard, function (req, res) { res.json({ ok: true, active: flash.active(), banner: flash.banner() }); });

router.post('/webhooks/emit', guard, function (req, res) { const b = req.body || {}; webhooks.emit(b.event, b.data).then(function (r) { res.json(r); }).catch(fail(res)); });

module.exports = router;
