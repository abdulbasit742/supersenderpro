'use strict';

/**
 * Ecommerce Hub — engagement + analytics routes.
 * POST /api/ecommerce-hub/loyalty/award   { phone, amount, orderId? }
 * GET  /api/ecommerce-hub/loyalty/balance?phone=...
 * POST /api/ecommerce-hub/loyalty/redeem  { phone }
 * GET  /api/ecommerce-hub/faq/list
 * POST /api/ecommerce-hub/faq/add         { keywords:[], answer }
 * GET  /api/ecommerce-hub/faq/answer?q=...
 * GET  /api/ecommerce-hub/analytics       (business snapshot)
 * POST /api/ecommerce-hub/lang            { phone, lang }
 * Read-only to platforms; persistent local state. Dry-run safe.
 */

const express = require('express');
const router = express.Router();
const loyalty = require('../lib/ecommerceHub/loyalty');
const faq = require('../lib/ecommerceHub/faq');
const analytics = require('../lib/ecommerceHub/analytics');
const i18n = require('../lib/ecommerceHub/i18n');

const ENABLED = String(process.env.ECOMMERCE_HUB_ENABLED || 'true').toLowerCase() !== 'false';
function guard(req, res, next) { if (!ENABLED) return res.status(403).json({ ok: false, error: 'Ecommerce Hub disabled.' }); next(); }

router.post('/loyalty/award', guard, function (req, res) { const b = req.body || {}; res.json(loyalty.award(b.phone, b.amount, { orderId: b.orderId })); });
router.get('/loyalty/balance', guard, function (req, res) { res.json({ ok: true, phone: req.query.phone, balance: loyalty.balance(req.query.phone) }); });
router.post('/loyalty/redeem', guard, function (req, res) { res.json(loyalty.redeem((req.body || {}).phone)); });

router.get('/faq/list', guard, function (req, res) { res.json({ ok: true, entries: faq.list() }); });
router.post('/faq/add', guard, function (req, res) { const b = req.body || {}; res.json({ ok: true, count: faq.add(b.keywords, b.answer) }); });
router.get('/faq/answer', guard, function (req, res) { res.json({ ok: true, q: req.query.q, answer: faq.answer(req.query.q) }); });

router.get('/analytics', guard, function (req, res) { analytics.snapshot().then(function (s) { res.json({ ok: true, snapshot: s }); }).catch(function (e) { res.status(500).json({ ok: false, error: e && e.message }); }); });

router.post('/lang', guard, function (req, res) { const b = req.body || {}; res.json({ ok: i18n.setLang(b.phone, b.lang), lang: i18n.getLang(b.phone) }); });

module.exports = router;
