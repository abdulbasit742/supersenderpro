'use strict';

/**
 * Ecommerce Hub — ops + growth batch-2 routes.
 * GET  /api/ecommerce-hub/courier/pick?city=Karachi&region=Sindh
 * GET  /api/ecommerce-hub/export/products.csv
 * GET  /api/ecommerce-hub/export/clients.csv
 * GET  /api/ecommerce-hub/segments
 * POST /api/ecommerce-hub/scheduler/schedule  { message, at, platform? }
 * POST /api/ecommerce-hub/scheduler/run
 * GET  /api/ecommerce-hub/scheduler/list
 * GET  /api/ecommerce-hub/catalog/cards?platform=&limit=
 * GET  /api/ecommerce-hub/catalog/card?id=DRZ-1001
 * Read-only to platforms; persistent local state. Dry-run safe.
 */

const express = require('express');
const router = express.Router();
const courier = require('../lib/ecommerceHub/courierRouter');
const exporter = require('../lib/ecommerceHub/exporter');
const segments = require('../lib/ecommerceHub/segments');
const scheduler = require('../lib/ecommerceHub/scheduler');
const catalogCards = require('../lib/ecommerceHub/catalogCards');

const ENABLED = String(process.env.ECOMMERCE_HUB_ENABLED || 'true').toLowerCase() !== 'false';
function guard(req, res, next) { if (!ENABLED) return res.status(403).json({ ok: false, error: 'Ecommerce Hub disabled.' }); next(); }

router.get('/courier/pick', guard, function (req, res) { res.json(courier.explain(req.query.city, req.query.region)); });

router.get('/export/products.csv', guard, function (req, res) {
  exporter.productsCsv().then(function (csv) { res.set('Content-Type', 'text/csv'); res.set('Content-Disposition', 'attachment; filename=products.csv'); res.send(csv); })
    .catch(function (e) { res.status(500).json({ ok: false, error: e && e.message }); });
});
router.get('/export/clients.csv', guard, function (req, res) {
  exporter.clientsCsv().then(function (csv) { res.set('Content-Type', 'text/csv'); res.set('Content-Disposition', 'attachment; filename=clients.csv'); res.send(csv); })
    .catch(function (e) { res.status(500).json({ ok: false, error: e && e.message }); });
});

router.get('/segments', guard, function (req, res) { segments.build().then(function (s) { res.json(s); }).catch(function (e) { res.status(500).json({ ok: false, error: e && e.message }); }); });

router.post('/scheduler/schedule', guard, function (req, res) { res.json(scheduler.schedule(req.body || {})); });
router.post('/scheduler/run', guard, function (req, res) { scheduler.runDue().then(function (r) { res.json(r); }).catch(function (e) { res.status(500).json({ ok: false, error: e && e.message }); }); });
router.get('/scheduler/list', guard, function (req, res) { res.json({ ok: true, jobs: scheduler.list() }); });

router.get('/catalog/cards', guard, function (req, res) { res.json({ ok: true, cards: catalogCards.cardsFor({ platform: req.query.platform, limit: req.query.limit, inStockOnly: req.query.inStockOnly === 'true' }) }); });
router.get('/catalog/card', guard, function (req, res) { const c = catalogCards.cardFor(req.query.id); res.json(c ? { ok: true, card: c } : { ok: false, error: 'not_found' }); });

module.exports = router;
