'use strict';

/**
 * Ecommerce Hub — admin panel + self-test routes.
 * GET /api/ecommerce-hub/selftest  -> JSON ship-readiness report
 * GET /api/ecommerce-hub/panel     -> control panel HTML
 * Read-only; sends nothing.
 */

const express = require('express');
const path = require('path');
const router = express.Router();
const selfTest = require('../lib/ecommerceHub/selfTest');

const ENABLED = String(process.env.ECOMMERCE_HUB_ENABLED || 'true').toLowerCase() !== 'false';
function guard(req, res, next) { if (!ENABLED) return res.status(403).json({ ok: false, error: 'Ecommerce Hub disabled.' }); next(); }

router.get('/selftest', guard, function (req, res) { res.json(selfTest.run()); });
router.get('/panel', function (req, res) { res.sendFile(path.join(process.cwd(), 'public', 'ecommerce-hub-panel.html')); });

module.exports = router;
