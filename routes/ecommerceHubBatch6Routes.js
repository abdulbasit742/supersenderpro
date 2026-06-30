'use strict';

/**
 * Ecommerce Hub — batch-6 routes.
 * GET  /api/ecommerce-hub/inventory/unified
 * GET  /api/ecommerce-hub/clv
 * POST /api/ecommerce-hub/subscriptions/create   { phone, productId, everyDays }
 * POST /api/ecommerce-hub/subscriptions/due
 * GET  /api/ecommerce-hub/delivery/slots?date=YYYY-MM-DD
 * POST /api/ecommerce-hub/delivery/book          { date, slot, orderId, phone }
 * GET  /api/ecommerce-hub/geo-fee?city=Karachi&total=1500
 * POST /api/ecommerce-hub/import/products        { csv }
 * POST /api/ecommerce-hub/tickets/open           { phone, message }
 * POST /api/ecommerce-hub/tickets/reply          { id, text }
 * GET  /api/ecommerce-hub/tickets/list
 * GET  /api/ecommerce-hub/loyalty/tier?phone=...
 * GET  /api/ecommerce-hub/sales-report
 * GET  /api/ecommerce-hub/conversion
 * GET  /api/ecommerce-hub/quick-replies
 * POST /api/ecommerce-hub/order/edit             { orderId, phone, kind, detail }
 * Read-only to platforms; persistent local state. Dry-run safe.
 */

const express = require('express');
const router = express.Router();
const unifiedInventory = require('../lib/ecommerceHub/unifiedInventory');
const clv = require('../lib/ecommerceHub/clv');
const subscriptions = require('../lib/ecommerceHub/subscriptions');
const deliverySlots = require('../lib/ecommerceHub/deliverySlots');
const geoFees = require('../lib/ecommerceHub/geoFees');
const bulkImport = require('../lib/ecommerceHub/bulkImport');
const tickets = require('../lib/ecommerceHub/supportTickets');
const loyaltyTiers = require('../lib/ecommerceHub/loyaltyTiers');
const salesReport = require('../lib/ecommerceHub/salesReport');
const conversionStats = require('../lib/ecommerceHub/conversionStats');
const quickReplies = require('../lib/ecommerceHub/quickReplies');
const orderEdit = require('../lib/ecommerceHub/orderEdit');

const ENABLED = String(process.env.ECOMMERCE_HUB_ENABLED || 'true').toLowerCase() !== 'false';
function guard(req, res, next) { if (!ENABLED) return res.status(403).json({ ok: false, error: 'Ecommerce Hub disabled.' }); next(); }
function fail(res) { return function (e) { res.status(500).json({ ok: false, error: e && e.message }); }; }

router.get('/inventory/unified', guard, function (req, res) { unifiedInventory.build().then(function (r) { res.json(r); }).catch(fail(res)); });
router.get('/clv', guard, function (req, res) { clv.build().then(function (r) { res.json(r); }).catch(fail(res)); });

router.post('/subscriptions/create', guard, function (req, res) { res.json(subscriptions.create(req.body || {})); });
router.post('/subscriptions/due', guard, function (req, res) { subscriptions.due().then(function (r) { res.json(r); }).catch(fail(res)); });

router.get('/delivery/slots', guard, function (req, res) { res.json({ ok: true, date: req.query.date, slots: deliverySlots.available(req.query.date) }); });
router.post('/delivery/book', guard, function (req, res) { res.json(deliverySlots.book(req.body || {})); });

router.get('/geo-fee', guard, function (req, res) { res.json(geoFees.feeFor(req.query.city, Number(req.query.total))); });

router.post('/import/products', guard, function (req, res) { res.json(bulkImport.importCsv((req.body && req.body.csv) || '')); });

router.post('/tickets/open', guard, function (req, res) { const b = req.body || {}; tickets.open(b.phone, b.message).then(function (r) { res.json(r); }).catch(fail(res)); });
router.post('/tickets/reply', guard, function (req, res) { const b = req.body || {}; tickets.reply(b.id, b.text, 'agent').then(function (r) { res.json(r); }).catch(fail(res)); });
router.get('/tickets/list', guard, function (req, res) { res.json({ ok: true, tickets: tickets.list(req.query.status) }); });

router.get('/loyalty/tier', guard, function (req, res) { res.json({ ok: true, reply: loyaltyTiers.reply(req.query.phone) }); });

router.get('/sales-report', guard, function (req, res) { salesReport.build().then(function (r) { res.json(r); }).catch(fail(res)); });
router.get('/conversion', guard, function (req, res) { res.json(conversionStats.build()); });
router.get('/quick-replies', guard, function (req, res) { res.json({ ok: true, templates: quickReplies.list() }); });

router.post('/order/edit', guard, function (req, res) { orderEdit.request(req.body || {}).then(function (r) { res.json(r); }).catch(fail(res)); });

module.exports = router;
